-- =============================================================================
-- SISTEM ASESMEN & PROFIL KESIAPAN KERJA SISWA SMK (EMPLOYASKILLS)
-- Migration 002: Hardened Security, Dual Connection Roles, and Strict Multi-Tenant RLS
-- Target: Supabase PostgreSQL 17.x (Singapore ap-southeast-1)
-- Schema: employa
-- =============================================================================

SET search_path TO employa, public;

-- =============================================================================
-- 1. PEMISAHAN ROLE DATABASE TERAUTENTIKASI (LEAST PRIVILEGE)
--   employa_app    : Role koneksi backend Express (Web API siswa & guru)
--   employa_worker : Role koneksi terpisah khusus background AI Worker
-- CATATAN: Password disuntikkan via environment variable server (tanpa hardcode)
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'employa_app') THEN
        CREATE ROLE employa_app WITH LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'employa_worker') THEN
        CREATE ROLE employa_worker WITH LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
    END IF;
END $$;

-- Cabut akses dari role employa_runtime lama untuk menutup seluruh jalur akses samping
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'employa_runtime') THEN
        REVOKE ALL ON ALL TABLES IN SCHEMA employa FROM employa_runtime;
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA employa FROM employa_runtime;
        REVOKE ALL ON SCHEMA employa FROM employa_runtime;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- IZIN SCHEMA & TABEL UNTUK employa_app (Web API)
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA employa TO employa_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA employa TO employa_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA employa TO employa_app;

-- Cabut hak TRUNCATE pada seluruh tabel
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA employa FROM employa_app;

-- Kunci tabel schema_migrations: Hanya SELECT, dilarang mutasi oleh runtime
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON employa.schema_migrations FROM employa_app;
GRANT SELECT ON employa.schema_migrations TO employa_app;

-- Kunci audit trail guru (teacher_edit_logs): Append-Only, DILARANG UPDATE & DELETE
REVOKE UPDATE, DELETE, TRUNCATE ON employa.teacher_edit_logs FROM employa_app;
GRANT SELECT, INSERT ON employa.teacher_edit_logs TO employa_app;

-- PROTEKSI HASH PASSWORD: Cabut hak SELECT bebas atas kolom password_hash
-- Pengguna umum dan endpoint biasa tidak dapat membaca password_hash
REVOKE SELECT (password_hash) ON employa.users FROM employa_app;

-- -----------------------------------------------------------------------------
-- IZIN LEAST PRIVILEGE UNTUK employa_worker (Background AI Worker)
-- Hanya butuh antrean AI jobs, pembaruan skor AI pada submissions, dan bukti multimodal
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA employa TO employa_worker;
REVOKE ALL ON ALL TABLES IN SCHEMA employa FROM employa_worker;

GRANT SELECT, INSERT, UPDATE ON employa.ai_evaluation_jobs TO employa_worker;
GRANT SELECT, UPDATE ON employa.submissions TO employa_worker;
GRANT SELECT, INSERT, UPDATE ON employa.evidence_metadata TO employa_worker;
GRANT SELECT ON employa.exams TO employa_worker;
GRANT SELECT ON employa.packages TO employa_worker;
GRANT SELECT ON employa.questions TO employa_worker;
GRANT SELECT (id, name, school_id, identity_no) ON employa.users TO employa_worker;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA employa TO employa_worker;

REVOKE DELETE, TRUNCATE ON ALL TABLES IN SCHEMA employa FROM employa_worker;

-- =============================================================================
-- 2. HELPER SECURITY DEFINER FUNCTIONS (DENGAN SEARCH_PATH AMAN & PRIVILEGE KETAT)
-- Mencegah privilege escalation dan verifikasi identitas fisik koneksi
-- =============================================================================

-- Fungsi: Cek apakah pemanggil adalah Administrator terverifikasi di tabel users
CREATE OR REPLACE FUNCTION employa.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM employa.users
        WHERE id = NULLIF(current_setting('app.current_user_id', true), '')
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = employa, pg_temp;

-- Fungsi: Ambil school_id terverifikasi milik user langsung dari tabel users
CREATE OR REPLACE FUNCTION employa.get_verified_school_id()
RETURNS TEXT AS $$
DECLARE
    v_user_id TEXT;
    v_school_id TEXT;
BEGIN
    v_user_id := NULLIF(current_setting('app.current_user_id', true), '');
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT school_id INTO v_school_id
    FROM employa.users
    WHERE id = v_user_id;

    RETURN v_school_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = employa, pg_temp;

-- Fungsi: Cek apakah pemanggil adalah Guru terverifikasi
CREATE OR REPLACE FUNCTION employa.is_verified_teacher()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM employa.users
        WHERE id = NULLIF(current_setting('app.current_user_id', true), '')
        AND role = 'guru'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = employa, pg_temp;

-- Fungsi: Cek apakah pemanggil adalah Siswa terverifikasi
CREATE OR REPLACE FUNCTION employa.is_verified_student()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM employa.users
        WHERE id = NULLIF(current_setting('app.current_user_id', true), '')
        AND role = 'siswa'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = employa, pg_temp;

-- Fungsi: Cek apakah proses adalah AI Worker yang sah
-- Menggunakan SESSION_USER (bukan CURRENT_USER) agar tahan terhadap manipulasi di dalam SECURITY DEFINER
CREATE OR REPLACE FUNCTION employa.is_worker_process()
RETURNS BOOLEAN AS $$
BEGIN
    -- Verifikasi identitas fisik koneksi PostgreSQL secara mutlak.
    -- Role employa_app (Web API) tidak dapat mengubah SESSION_USER tanpa hak superuser.
    RETURN (SESSION_USER = 'employa_worker');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = employa, pg_temp;

-- Fungsi Khusus Backend: Autentikasi Pengguna saat Login (Akses Terbatas ke Hash)
CREATE OR REPLACE FUNCTION employa.authenticate_user(p_email TEXT)
RETURNS TABLE (
    id TEXT,
    email TEXT,
    name TEXT,
    role TEXT,
    identity_no TEXT,
    school_id TEXT,
    school_name TEXT,
    class_id TEXT,
    class_name TEXT,
    password_hash TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.name, u.role, u.identity_no, u.school_id, u.school_name, u.class_id, u.class_name, u.password_hash
    FROM employa.users u
    WHERE lower(u.email) = lower(p_email)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = employa, pg_temp;

-- AMANKAN HAK EKSEKUSI: Cabut default dari PUBLIC, berikan hanya ke role yang sah
REVOKE ALL ON FUNCTION employa.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION employa.is_admin() TO employa_app, employa_worker;

REVOKE ALL ON FUNCTION employa.get_verified_school_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION employa.get_verified_school_id() TO employa_app, employa_worker;

REVOKE ALL ON FUNCTION employa.is_verified_teacher() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION employa.is_verified_teacher() TO employa_app, employa_worker;

REVOKE ALL ON FUNCTION employa.is_verified_student() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION employa.is_verified_student() TO employa_app, employa_worker;

REVOKE ALL ON FUNCTION employa.is_worker_process() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION employa.is_worker_process() TO employa_app, employa_worker;

REVOKE ALL ON FUNCTION employa.authenticate_user(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION employa.authenticate_user(TEXT) TO employa_app;

-- =============================================================================
-- 3. TRIGGER PROTEKSI KOLOM SENSITIF USERS & ANTI-REGISTRASI ADMIN
-- Menutup celah pembuatan admin/guru via registrasi mandiri
-- =============================================================================
CREATE OR REPLACE FUNCTION employa.protect_user_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Proteksi saat INSERT (Pembuatan Akun Baru):
    IF TG_OP = 'INSERT' THEN
        -- Registrasi publik tanpa otentikasi DILARANG membuat akun guru atau admin
        IF NEW.role IN ('admin', 'guru') THEN
            IF NOT employa.is_admin() THEN
                RAISE EXCEPTION 'Pelanggaran Keamanan: Pendaftaran akun dengan hak istimewa (guru/admin) hanya dapat dilakukan oleh Administrator terverifikasi!';
            END IF;
        END IF;
    END IF;

    -- 2. Proteksi saat UPDATE (Pembaruan Akun):
    IF TG_OP = 'UPDATE' THEN
        IF (OLD.role IS DISTINCT FROM NEW.role)
           OR (OLD.school_id IS DISTINCT FROM NEW.school_id)
           OR (OLD.identity_no IS DISTINCT FROM NEW.identity_no) THEN
            IF NOT employa.is_admin() THEN
                RAISE EXCEPTION 'Pelanggaran Keamanan: Perubahan role, sekolah (school_id), atau nomor identitas (identity_no) hanya dapat dilakukan oleh Administrator terverifikasi!';
            END IF;
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = employa, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_user_sensitive_fields ON employa.users;
CREATE TRIGGER trg_protect_user_sensitive_fields
    BEFORE INSERT OR UPDATE ON employa.users
    FOR EACH ROW
    EXECUTE FUNCTION employa.protect_user_sensitive_fields();

REVOKE ALL ON FUNCTION employa.protect_user_sensitive_fields() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION employa.protect_user_sensitive_fields() TO employa_app, employa_worker;

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) ACTIVATION & FORCING
-- =============================================================================
ALTER TABLE employa.schools                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE employa.schools                     FORCE ROW LEVEL SECURITY;

ALTER TABLE employa.users                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE employa.users                       FORCE ROW LEVEL SECURITY;

ALTER TABLE employa.classes                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE employa.classes                     FORCE ROW LEVEL SECURITY;

ALTER TABLE employa.teacher_assigned_classes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE employa.teacher_assigned_classes    FORCE ROW LEVEL SECURITY;

ALTER TABLE employa.packages                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE employa.packages                    FORCE ROW LEVEL SECURITY;

ALTER TABLE employa.questions                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE employa.questions                   FORCE ROW LEVEL SECURITY;

ALTER TABLE employa.exams                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE employa.exams                       FORCE ROW LEVEL SECURITY;

ALTER TABLE employa.submissions                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE employa.submissions                 FORCE ROW LEVEL SECURITY;

ALTER TABLE employa.teacher_edit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE employa.teacher_edit_logs           FORCE ROW LEVEL SECURITY;

ALTER TABLE employa.evidence_metadata           ENABLE ROW LEVEL SECURITY;
ALTER TABLE employa.evidence_metadata           FORCE ROW LEVEL SECURITY;

ALTER TABLE employa.exam_drafts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE employa.exam_drafts                 FORCE ROW LEVEL SECURITY;

ALTER TABLE employa.ai_evaluation_jobs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE employa.ai_evaluation_jobs          FORCE ROW LEVEL SECURITY;

ALTER TABLE employa.portfolios                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE employa.portfolios                  FORCE ROW LEVEL SECURITY;

ALTER TABLE employa.student_readiness_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE employa.student_readiness_profiles  FORCE ROW LEVEL SECURITY;

ALTER TABLE employa.archives                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE employa.archives                    FORCE ROW LEVEL SECURITY;

ALTER TABLE employa.system_settings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE employa.system_settings             FORCE ROW LEVEL SECURITY;

-- Bersihkan seluruh kebijakan lama
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'employa'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON employa.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- =============================================================================
-- 5. KEBIJAKAN RLS KETAT (ZERO BYPASS school_id IS NULL BAGI GURU)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABEL: submissions (Inti Penilaian Akademik Siswa)
-- -----------------------------------------------------------------------------
-- SELECT:
-- 1. Admin: melihat semua submission (termasuk legacy NULL untuk rekonsiliasi).
-- 2. Siswa: HANYA melihat submission miliknya sendiri.
-- 3. Guru: HANYA melihat submission sekolah terverifikasi miliknya (school_id IS NOT NULL).
-- 4. Worker: membaca saat memproses antrean AI.
CREATE POLICY p_submissions_select ON employa.submissions
    FOR SELECT
    TO employa_app, employa_worker
    USING (
        employa.is_admin()
        OR (
            employa.is_verified_student()
            AND student_id = NULLIF(current_setting('app.current_user_id', true), '')
        )
        OR (
            employa.is_verified_teacher()
            AND school_id IS NOT NULL
            AND school_id = employa.get_verified_school_id()
        )
        OR employa.is_worker_process()
    );

-- INSERT: Siswa yang mengerjakan (atau admin)
CREATE POLICY p_submissions_insert ON employa.submissions
    FOR INSERT
    TO employa_app
    WITH CHECK (
        employa.is_admin()
        OR (
            employa.is_verified_student()
            AND student_id = NULLIF(current_setting('app.current_user_id', true), '')
        )
    );

-- UPDATE:
-- Siswa DILARANG UPDATE setelah submit.
-- Guru HANYA dapat update submission di sekolahnya yang sah (school_id IS NOT NULL).
-- Worker hanya untuk AI scoring.
CREATE POLICY p_submissions_update ON employa.submissions
    FOR UPDATE
    TO employa_app, employa_worker
    USING (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND school_id IS NOT NULL
            AND school_id = employa.get_verified_school_id()
        )
        OR employa.is_worker_process()
    )
    WITH CHECK (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND school_id IS NOT NULL
            AND school_id = employa.get_verified_school_id()
        )
        OR employa.is_worker_process()
    );

-- DELETE: Hanya Admin
CREATE POLICY p_submissions_delete ON employa.submissions
    FOR DELETE
    TO employa_app
    USING (employa.is_admin());

-- -----------------------------------------------------------------------------
-- TABEL: schools
-- -----------------------------------------------------------------------------
CREATE POLICY p_schools_select ON employa.schools
    FOR SELECT
    TO employa_app, employa_worker
    USING (
        employa.is_admin()
        OR id = employa.get_verified_school_id()
        OR employa.is_worker_process()
    );

CREATE POLICY p_schools_modify ON employa.schools
    FOR ALL
    TO employa_app
    USING (employa.is_admin())
    WITH CHECK (employa.is_admin());

-- -----------------------------------------------------------------------------
-- TABEL: users
-- -----------------------------------------------------------------------------
CREATE POLICY p_users_select ON employa.users
    FOR SELECT
    TO employa_app, employa_worker
    USING (
        employa.is_admin()
        OR id = NULLIF(current_setting('app.current_user_id', true), '')
        OR (
            school_id IS NOT NULL
            AND school_id = employa.get_verified_school_id()
        )
        OR employa.is_worker_process()
    );

-- Registrasi mandiri tanpa login HANYA diizinkan untuk role 'siswa'
CREATE POLICY p_users_insert ON employa.users
    FOR INSERT
    TO employa_app
    WITH CHECK (
        employa.is_admin()
        OR (
            NULLIF(current_setting('app.current_user_id', true), '') IS NULL
            AND role = 'siswa'
        )
    );

CREATE POLICY p_users_update ON employa.users
    FOR UPDATE
    TO employa_app
    USING (
        employa.is_admin()
        OR id = NULLIF(current_setting('app.current_user_id', true), '')
    )
    WITH CHECK (
        employa.is_admin()
        OR id = NULLIF(current_setting('app.current_user_id', true), '')
    );

CREATE POLICY p_users_delete ON employa.users
    FOR DELETE
    TO employa_app
    USING (employa.is_admin());

-- -----------------------------------------------------------------------------
-- TABEL: classes
-- -----------------------------------------------------------------------------
CREATE POLICY p_classes_select ON employa.classes
    FOR SELECT
    TO employa_app, employa_worker
    USING (
        employa.is_admin()
        OR (
            school_id IS NOT NULL
            AND school_id = employa.get_verified_school_id()
        )
        OR employa.is_worker_process()
    );

CREATE POLICY p_classes_modify ON employa.classes
    FOR ALL
    TO employa_app
    USING (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND school_id IS NOT NULL
            AND school_id = employa.get_verified_school_id()
        )
    )
    WITH CHECK (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND school_id IS NOT NULL
            AND school_id = employa.get_verified_school_id()
        )
    );

-- -----------------------------------------------------------------------------
-- TABEL: teacher_assigned_classes
-- Guru dapat melihat dan mengelola mapping kelas pada sekolah terverifikasinya
-- -----------------------------------------------------------------------------
CREATE POLICY p_teacher_classes_select ON employa.teacher_assigned_classes
    FOR SELECT
    TO employa_app, employa_worker
    USING (
        employa.is_admin()
        OR teacher_id = NULLIF(current_setting('app.current_user_id', true), '')
        OR (
            employa.is_verified_teacher()
            AND EXISTS (
                SELECT 1 FROM employa.users u
                WHERE u.id = teacher_assigned_classes.teacher_id
                AND u.school_id IS NOT NULL
                AND u.school_id = employa.get_verified_school_id()
            )
        )
        OR employa.is_worker_process()
    );

CREATE POLICY p_teacher_classes_modify ON employa.teacher_assigned_classes
    FOR ALL
    TO employa_app
    USING (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND EXISTS (
                SELECT 1 FROM employa.users u
                WHERE u.id = teacher_assigned_classes.teacher_id
                AND u.school_id IS NOT NULL
                AND u.school_id = employa.get_verified_school_id()
            )
        )
    )
    WITH CHECK (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND EXISTS (
                SELECT 1 FROM employa.users u
                WHERE u.id = teacher_assigned_classes.teacher_id
                AND u.school_id IS NOT NULL
                AND u.school_id = employa.get_verified_school_id()
            )
        )
    );

-- -----------------------------------------------------------------------------
-- TABEL: exams
-- TIDAK ADA BYPASS school_id IS NULL: Sesi tanpa school_id HANYA untuk Admin
-- -----------------------------------------------------------------------------
CREATE POLICY p_exams_select ON employa.exams
    FOR SELECT
    TO employa_app, employa_worker
    USING (
        employa.is_admin()
        OR (
            school_id IS NOT NULL
            AND school_id = employa.get_verified_school_id()
        )
        OR employa.is_worker_process()
    );

CREATE POLICY p_exams_insert ON employa.exams
    FOR INSERT
    TO employa_app
    WITH CHECK (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND school_id IS NOT NULL
            AND school_id = employa.get_verified_school_id()
        )
    );

CREATE POLICY p_exams_update ON employa.exams
    FOR UPDATE
    TO employa_app, employa_worker
    USING (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND school_id IS NOT NULL
            AND school_id = employa.get_verified_school_id()
        )
        OR employa.is_worker_process()
    )
    WITH CHECK (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND school_id IS NOT NULL
            AND school_id = employa.get_verified_school_id()
        )
        OR employa.is_worker_process()
    );

CREATE POLICY p_exams_delete ON employa.exams
    FOR DELETE
    TO employa_app
    USING (employa.is_admin());

-- -----------------------------------------------------------------------------
-- TABEL: evidence_metadata
-- Guru HANYA dapat melihat bukti submission dari sekolahnya yang sah
-- Siswa HANYA dapat mengunggah bukti pada submission miliknya sendiri
-- -----------------------------------------------------------------------------
CREATE POLICY p_evidence_select ON employa.evidence_metadata
    FOR SELECT
    TO employa_app, employa_worker
    USING (
        employa.is_admin()
        OR (
            employa.is_verified_student()
            AND EXISTS (
                SELECT 1 FROM employa.submissions s
                WHERE s.id = evidence_metadata.submission_id
                AND s.student_id = NULLIF(current_setting('app.current_user_id', true), '')
            )
        )
        OR (
            employa.is_verified_teacher()
            AND EXISTS (
                SELECT 1 FROM employa.submissions s
                WHERE s.id = evidence_metadata.submission_id
                AND s.school_id IS NOT NULL
                AND s.school_id = employa.get_verified_school_id()
            )
        )
        OR employa.is_worker_process()
    );

CREATE POLICY p_evidence_insert ON employa.evidence_metadata
    FOR INSERT
    TO employa_app, employa_worker
    WITH CHECK (
        employa.is_admin()
        OR (
            employa.is_verified_student()
            AND EXISTS (
                SELECT 1 FROM employa.submissions s
                WHERE s.id = evidence_metadata.submission_id
                AND s.student_id = NULLIF(current_setting('app.current_user_id', true), '')
            )
        )
        OR employa.is_worker_process()
    );

CREATE POLICY p_evidence_update ON employa.evidence_metadata
    FOR UPDATE
    TO employa_app, employa_worker
    USING (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND EXISTS (
                SELECT 1 FROM employa.submissions s
                WHERE s.id = evidence_metadata.submission_id
                AND s.school_id IS NOT NULL
                AND s.school_id = employa.get_verified_school_id()
            )
        )
        OR employa.is_worker_process()
    )
    WITH CHECK (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND EXISTS (
                SELECT 1 FROM employa.submissions s
                WHERE s.id = evidence_metadata.submission_id
                AND s.school_id IS NOT NULL
                AND s.school_id = employa.get_verified_school_id()
            )
        )
        OR employa.is_worker_process()
    );

CREATE POLICY p_evidence_delete ON employa.evidence_metadata
    FOR DELETE
    TO employa_app
    USING (employa.is_admin());

-- -----------------------------------------------------------------------------
-- TABEL: teacher_edit_logs (Audit Trail - Strictly Append-Only)
-- -----------------------------------------------------------------------------
CREATE POLICY p_edit_logs_select ON employa.teacher_edit_logs
    FOR SELECT
    TO employa_app
    USING (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND EXISTS (
                SELECT 1 FROM employa.submissions s
                WHERE s.id = teacher_edit_logs.submission_id
                AND s.school_id IS NOT NULL
                AND s.school_id = employa.get_verified_school_id()
            )
        )
    );

CREATE POLICY p_edit_logs_insert ON employa.teacher_edit_logs
    FOR INSERT
    TO employa_app
    WITH CHECK (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND teacher_id = NULLIF(current_setting('app.current_user_id', true), '')
        )
    );

-- -----------------------------------------------------------------------------
-- TABEL: portfolios (Portofolio Siswa)
-- Guru HANYA dapat melihat portofolio siswa dari sekolah yang sama
-- -----------------------------------------------------------------------------
CREATE POLICY p_portfolios_select ON employa.portfolios
    FOR SELECT
    TO employa_app
    USING (
        employa.is_admin()
        OR student_id = NULLIF(current_setting('app.current_user_id', true), '')
        OR (
            employa.is_verified_teacher()
            AND EXISTS (
                SELECT 1 FROM employa.users u
                WHERE u.id = portfolios.student_id
                AND u.school_id IS NOT NULL
                AND u.school_id = employa.get_verified_school_id()
            )
        )
    );

CREATE POLICY p_portfolios_modify ON employa.portfolios
    FOR ALL
    TO employa_app
    USING (
        employa.is_admin()
        OR student_id = NULLIF(current_setting('app.current_user_id', true), '')
    )
    WITH CHECK (
        employa.is_admin()
        OR student_id = NULLIF(current_setting('app.current_user_id', true), '')
    );

-- -----------------------------------------------------------------------------
-- TABEL: student_readiness_profiles
-- -----------------------------------------------------------------------------
CREATE POLICY p_readiness_select ON employa.student_readiness_profiles
    FOR SELECT
    TO employa_app
    USING (
        employa.is_admin()
        OR student_id = NULLIF(current_setting('app.current_user_id', true), '')
        OR (
            employa.is_verified_teacher()
            AND EXISTS (
                SELECT 1 FROM employa.users u
                WHERE u.id = student_readiness_profiles.student_id
                AND u.school_id IS NOT NULL
                AND u.school_id = employa.get_verified_school_id()
            )
        )
    );

CREATE POLICY p_readiness_modify ON employa.student_readiness_profiles
    FOR ALL
    TO employa_app
    USING (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND EXISTS (
                SELECT 1 FROM employa.users u
                WHERE u.id = student_readiness_profiles.student_id
                AND u.school_id IS NOT NULL
                AND u.school_id = employa.get_verified_school_id()
            )
        )
    )
    WITH CHECK (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND EXISTS (
                SELECT 1 FROM employa.users u
                WHERE u.id = student_readiness_profiles.student_id
                AND u.school_id IS NOT NULL
                AND u.school_id = employa.get_verified_school_id()
            )
        )
    );

-- -----------------------------------------------------------------------------
-- TABEL: exam_drafts (Autosave Transient)
-- -----------------------------------------------------------------------------
CREATE POLICY p_drafts_all ON employa.exam_drafts
    FOR ALL
    TO employa_app
    USING (
        student_id = NULLIF(current_setting('app.current_user_id', true), '')
        OR employa.is_admin()
    )
    WITH CHECK (
        student_id = NULLIF(current_setting('app.current_user_id', true), '')
        OR employa.is_admin()
    );

-- -----------------------------------------------------------------------------
-- TABEL: ai_evaluation_jobs (Antrean Penilaian AI)
-- Guru HANYA dapat melihat job untuk submission dari sekolah terverifikasinya
-- -----------------------------------------------------------------------------
CREATE POLICY p_ai_jobs_select ON employa.ai_evaluation_jobs
    FOR SELECT
    TO employa_app, employa_worker
    USING (
        employa.is_worker_process()
        OR employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND EXISTS (
                SELECT 1 FROM employa.submissions s
                WHERE s.id = ai_evaluation_jobs.submission_id
                AND s.school_id IS NOT NULL
                AND s.school_id = employa.get_verified_school_id()
            )
        )
    );

CREATE POLICY p_ai_jobs_modify ON employa.ai_evaluation_jobs
    FOR ALL
    TO employa_app, employa_worker
    USING (
        employa.is_worker_process()
        OR employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND EXISTS (
                SELECT 1 FROM employa.submissions s
                WHERE s.id = ai_evaluation_jobs.submission_id
                AND s.school_id IS NOT NULL
                AND s.school_id = employa.get_verified_school_id()
            )
        )
    )
    WITH CHECK (
        employa.is_worker_process()
        OR employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND EXISTS (
                SELECT 1 FROM employa.submissions s
                WHERE s.id = ai_evaluation_jobs.submission_id
                AND s.school_id IS NOT NULL
                AND s.school_id = employa.get_verified_school_id()
            )
        )
    );

-- -----------------------------------------------------------------------------
-- TABEL BANK SOAL: packages & questions (Proteksi Kunci Jawaban & Rubrik)
-- Siswa DILARANG membaca langsung tabel questions & packages
-- Guru hanya dapat memodifikasi paket yang ia buat sendiri atau milik sekolahnya
-- -----------------------------------------------------------------------------
CREATE POLICY p_packages_select ON employa.packages
    FOR SELECT
    TO employa_app, employa_worker
    USING (
        employa.is_admin()
        OR employa.is_verified_teacher()
        OR employa.is_worker_process()
    );

CREATE POLICY p_packages_modify ON employa.packages
    FOR ALL
    TO employa_app
    USING (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND created_by IS NOT NULL
            AND (
                created_by = NULLIF(current_setting('app.current_user_id', true), '')
                OR EXISTS (
                    SELECT 1 FROM employa.users u
                    WHERE u.id = packages.created_by
                    AND u.school_id IS NOT NULL
                    AND u.school_id = employa.get_verified_school_id()
                )
            )
        )
    )
    WITH CHECK (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND created_by IS NOT NULL
            AND (
                created_by = NULLIF(current_setting('app.current_user_id', true), '')
                OR EXISTS (
                    SELECT 1 FROM employa.users u
                    WHERE u.id = packages.created_by
                    AND u.school_id IS NOT NULL
                    AND u.school_id = employa.get_verified_school_id()
                )
            )
        )
    );

CREATE POLICY p_questions_select ON employa.questions
    FOR SELECT
    TO employa_app, employa_worker
    USING (
        employa.is_admin()
        OR employa.is_verified_teacher()
        OR employa.is_worker_process()
    );

CREATE POLICY p_questions_modify ON employa.questions
    FOR ALL
    TO employa_app
    USING (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND EXISTS (
                SELECT 1 FROM employa.packages pkg
                WHERE pkg.id = questions.package_id
                AND pkg.created_by IS NOT NULL
                AND (
                    pkg.created_by = NULLIF(current_setting('app.current_user_id', true), '')
                    OR EXISTS (
                        SELECT 1 FROM employa.users u
                        WHERE u.id = pkg.created_by
                        AND u.school_id IS NOT NULL
                        AND u.school_id = employa.get_verified_school_id()
                    )
                )
            )
        )
    )
    WITH CHECK (
        employa.is_admin()
        OR (
            employa.is_verified_teacher()
            AND EXISTS (
                SELECT 1 FROM employa.packages pkg
                WHERE pkg.id = questions.package_id
                AND pkg.created_by IS NOT NULL
                AND (
                    pkg.created_by = NULLIF(current_setting('app.current_user_id', true), '')
                    OR EXISTS (
                        SELECT 1 FROM employa.users u
                        WHERE u.id = pkg.created_by
                        AND u.school_id IS NOT NULL
                        AND u.school_id = employa.get_verified_school_id()
                    )
                )
            )
        )
    );

-- -----------------------------------------------------------------------------
-- TABEL SISTEM: system_settings & archives (Hanya Admin)
-- -----------------------------------------------------------------------------
CREATE POLICY p_settings_select ON employa.system_settings FOR SELECT TO employa_app, employa_worker USING (true);
CREATE POLICY p_settings_modify ON employa.system_settings FOR ALL TO employa_app
    USING (employa.is_admin())
    WITH CHECK (employa.is_admin());

CREATE POLICY p_archives_select ON employa.archives FOR SELECT TO employa_app
    USING (employa.is_admin());
CREATE POLICY p_archives_modify ON employa.archives FOR ALL TO employa_app
    USING (employa.is_admin())
    WITH CHECK (employa.is_admin());

-- =============================================================================
-- 6. TRIGGER PROTEKSI NILAI FINAL GURU TERHADAP OVERWRITE AI WORKER
-- =============================================================================
CREATE OR REPLACE FUNCTION employa.protect_validated_teacher_score()
RETURNS TRIGGER AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_is_teacher BOOLEAN;
    v_is_worker BOOLEAN;
BEGIN
    v_is_admin := employa.is_admin();
    v_is_teacher := employa.is_verified_teacher();
    v_is_worker := employa.is_worker_process();

    -- Jika submission telah berstatus divalidasi oleh guru (approved atau revised)
    IF OLD.is_teacher_validated = TRUE AND OLD.validation_status IN ('approved', 'revised') THEN

        -- KASUS 1: Pekerjaan background AI selesai belakangan setelah guru selesai menilai.
        -- AI Worker DILARANG KERAS menimpa skor guru, total skor, atau mengubah status validasi!
        IF v_is_worker OR (NEW.ai_grading_status IS DISTINCT FROM OLD.ai_grading_status AND NOT v_is_teacher AND NOT v_is_admin) THEN
            NEW.teacher_score_total := OLD.teacher_score_total;
            NEW.total_score := OLD.teacher_score_total;
            NEW.is_teacher_validated := TRUE;
            NEW.validation_status := OLD.validation_status;
            NEW.validated_by := OLD.validated_by;
            NEW.validated_at := OLD.validated_at;
            NEW.teacher_notes := OLD.teacher_notes;
        END IF;

        -- KASUS 2: Percobaan un-validation ilegal
        IF NEW.is_teacher_validated = FALSE THEN
            RAISE EXCEPTION 'Pelanggaran Integritas: Nilai yang telah divalidasi oleh guru tidak boleh di-unvalidate kembali!';
        END IF;

        -- KASUS 3: Guru terverifikasi atau Admin melakukan revisi nilai sah
        IF v_is_teacher OR v_is_admin THEN
            IF NEW.teacher_score_total IS DISTINCT FROM OLD.teacher_score_total THEN
                NEW.total_score := NEW.teacher_score_total;
                NEW.validation_status := 'revised';
                NEW.is_teacher_validated := TRUE;
                NEW.validated_at := NOW();
            END IF;
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = employa, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_teacher_score ON employa.submissions;
CREATE TRIGGER trg_protect_teacher_score
    BEFORE UPDATE ON employa.submissions
    FOR EACH ROW
    EXECUTE FUNCTION employa.protect_validated_teacher_score();

REVOKE ALL ON FUNCTION employa.protect_validated_teacher_score() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION employa.protect_validated_teacher_score() TO employa_app, employa_worker;
