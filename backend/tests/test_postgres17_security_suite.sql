-- =============================================================================
-- SISTEM ASESMEN & PROFIL KESIAPAN KERJA SISWA SMK (EMPLOYASKILLS)
-- FILE: backend/tests/test_postgres17_security_suite.sql
-- TARGET: PostgreSQL 17.x (Docker / VPS Jagoan Hosting / Lab Baru)
-- TAHAP 9Q: INTEGRATION TEST KEAMANAN, MULTI-TENANT RLS & DUAL-ROLE POSTGRESQL 17
--
-- Karakteristik:
-- 1. Skema 100% sinkron dengan 001_initial_schema.sql & 002_security_and_rls.sql.
-- 2. Transaksional (BEGIN ... ROLLBACK): Tidak meninggalkan residu fixture.
-- 3. Assertion ketat: Jika terjadi pelanggaran keamanan, melempar EXCEPTION
--    dan psql menghasilkan exit code non-zero (\set ON_ERROR_STOP on).
-- 4. Pengujian AI Worker menggunakan identitas koneksi fisik (SESSION_USER).
-- =============================================================================

\set ON_ERROR_STOP on
\timing on

SELECT version();

-- =============================================================================
-- MEMULAI TRANSAKSI PENGUJIAN TERISOLASI
-- Seluruh fixture dan mutasi akan di-ROLLBACK di akhir skrip
-- =============================================================================
BEGIN;

DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'MEMULAI SETUP FIXTURES TAHAP 9Q PADA POSTGRESQL 17...';
    RAISE NOTICE '============================================================';
END $$;

-- -----------------------------------------------------------------------------
-- PEMBERSIHAN AWAL FIXTURE LAMA (JIKA ADA DARI SESI TERPUTUS SEBELUMNYA)
-- -----------------------------------------------------------------------------
DELETE FROM employa.teacher_edit_logs WHERE submission_id LIKE 'sub-lab9j-%';
DELETE FROM employa.evidence_metadata WHERE submission_id LIKE 'sub-lab9j-%';
DELETE FROM employa.ai_evaluation_jobs WHERE submission_id LIKE 'sub-lab9j-%';
DELETE FROM employa.exam_drafts WHERE student_id LIKE 'usr-lab9j-%';
DELETE FROM employa.submissions WHERE id LIKE 'sub-lab9j-%';
DELETE FROM employa.exams WHERE id LIKE 'exam-lab9j-%';
DELETE FROM employa.questions WHERE package_id LIKE 'pkg-lab9j-%';
DELETE FROM employa.packages WHERE id LIKE 'pkg-lab9j-%';
DELETE FROM employa.teacher_assigned_classes WHERE teacher_id LIKE 'usr-lab9j-%';

-- Putus siklus FK antara users dan classes
UPDATE employa.users SET class_id = NULL WHERE id LIKE 'usr-lab9j-%';
UPDATE employa.classes SET teacher_id = NULL WHERE school_id LIKE 'sch-lab9j-%';
DELETE FROM employa.users WHERE id LIKE 'usr-lab9j-%';
DELETE FROM employa.classes WHERE school_id LIKE 'sch-lab9j-%';
DELETE FROM employa.schools WHERE id LIKE 'sch-lab9j-%';

-- -----------------------------------------------------------------------------
-- 1. SETUP SEKOLAH UJI (Kolom: id, code, name, address, created_at, updated_at)
-- CATATAN: Kolom kode sekolah adalah 'code' (bukan npsn)
-- -----------------------------------------------------------------------------
INSERT INTO employa.schools (id, code, name, address, created_at, updated_at)
VALUES
    ('sch-lab9j-a', 'SCH-101', 'SMK Negeri 1 Test A (Kimia Industri)', 'Jl. Industri A No. 1', NOW(), NOW()),
    ('sch-lab9j-b', 'SCH-102', 'SMK Negeri 2 Test B (Teknik Kimia)', 'Jl. Industri B No. 2', NOW(), NOW());

-- -----------------------------------------------------------------------------
-- 2. SETUP KELAS UJI (Kolom: id, school_id, school_name, name, academic_year, class_code)
-- -----------------------------------------------------------------------------
INSERT INTO employa.classes (id, school_id, school_name, name, academic_year, class_code, created_at, updated_at)
VALUES
    ('cls-lab9j-a1', 'sch-lab9j-a', 'SMK Negeri 1 Test A (Kimia Industri)', 'XII KI 1', '2025/2026', 'CLS-A1', NOW(), NOW()),
    ('cls-lab9j-b1', 'sch-lab9j-b', 'SMK Negeri 2 Test B (Teknik Kimia)', 'XII TK 1', '2025/2026', 'CLS-B1', NOW(), NOW());

-- -----------------------------------------------------------------------------
-- 3. SETUP PENGGUNA UJI (Kolom: id, email, password_hash, name, role, identity_no, school_id, class_id)
-- CATATAN: Tanpa kolom fiktif 'is_active', role wajib IN ('admin', 'guru', 'siswa')
-- -----------------------------------------------------------------------------
INSERT INTO employa.users (id, email, password_hash, name, role, identity_no, school_id, school_name, class_id, class_name, created_at, updated_at)
VALUES
    ('usr-lab9j-admin', 'admin.lab9j@employa.local', '$2b$10$hash_admin_lab9j_secret_12345', 'Admin Lab 9J', 'admin', 'ADM001', NULL, NULL, NULL, NULL, NOW(), NOW()),
    ('usr-lab9j-guru-a', 'guru.a@employa.local', '$2b$10$hash_guru_a_secret_12345', 'Guru Sekolah A', 'guru', '19800101001', 'sch-lab9j-a', 'SMK Negeri 1 Test A (Kimia Industri)', NULL, NULL, NOW(), NOW()),
    ('usr-lab9j-guru-b', 'guru.b@employa.local', '$2b$10$hash_guru_b_secret_12345', 'Guru Sekolah B', 'guru', '19800101002', 'sch-lab9j-b', 'SMK Negeri 2 Test B (Teknik Kimia)', NULL, NULL, NOW(), NOW()),
    ('usr-lab9j-siswa-a', 'siswa.a@employa.local', '$2b$10$hash_siswa_a_secret_12345', 'Siswa Sekolah A', 'siswa', 'NISN001', 'sch-lab9j-a', 'SMK Negeri 1 Test A (Kimia Industri)', 'cls-lab9j-a1', 'XII KI 1', NOW(), NOW()),
    ('usr-lab9j-siswa-b', 'siswa.b@employa.local', '$2b$10$hash_siswa_b_secret_12345', 'Siswa Sekolah B', 'siswa', 'NISN002', 'sch-lab9j-b', 'SMK Negeri 2 Test B (Teknik Kimia)', 'cls-lab9j-b1', 'XII TK 1', NOW(), NOW());

-- -----------------------------------------------------------------------------
-- 4. SETUP MAPPING KELAS GURU (teacher_assigned_classes)
-- -----------------------------------------------------------------------------
INSERT INTO employa.teacher_assigned_classes (teacher_id, class_id, created_at)
VALUES
    ('usr-lab9j-guru-a', 'cls-lab9j-a1', NOW()),
    ('usr-lab9j-guru-b', 'cls-lab9j-b1', NOW());

-- -----------------------------------------------------------------------------
-- 5. SETUP PAKET SOAL (Kolom: id, code, title, description, category, duration_minutes, total_questions, questions, is_active, version, created_by)
-- -----------------------------------------------------------------------------
INSERT INTO employa.packages (id, code, title, description, category, duration_minutes, total_questions, questions, is_active, version, created_by, created_at, updated_at)
VALUES
    ('pkg-lab9j-system', 'PKG-SYS', 'Paket Standar Nasional (Sistem)', 'Paket Bank Soal Nasional', 'teknis_kimia', 60, 1, '[]'::jsonb, TRUE, 1, NULL, NOW(), NOW()),
    ('pkg-lab9j-a', 'PKG-A', 'Paket Internal Sekolah A', 'Dibuat Guru A', 'teknis_kimia', 45, 1, '[]'::jsonb, TRUE, 1, 'usr-lab9j-guru-a', NOW(), NOW()),
    ('pkg-lab9j-b', 'PKG-B', 'Paket Internal Sekolah B', 'Dibuat Guru B', 'teknis_kimia', 45, 1, '[]'::jsonb, TRUE, 1, 'usr-lab9j-guru-b', NOW(), NOW());

-- -----------------------------------------------------------------------------
-- 6. SETUP BUTIR SOAL (Kolom: id, package_id, code, number, category, question_text, type, rubric_guide)
-- CATATAN: question_text (bukan prompt), type (bukan question_type), rubric_guide (bukan rubric)
-- -----------------------------------------------------------------------------
INSERT INTO employa.questions (id, package_id, code, number, category, question_text, type, rubric_guide, created_at, updated_at)
VALUES
    ('q-lab9j-sys-1', 'pkg-lab9j-system', 'Q-SYS-1', 1, 'teknis_kimia', 'Sebutkan prinsip dasar destilasi bertingkat?', 'essay', 'Pemisahan berdasarkan perbedaan titik didih komponen campuran cairan.', NOW(), NOW()),
    ('q-lab9j-a-1', 'pkg-lab9j-a', 'Q-A-1', 1, 'teknis_kimia', 'Jelaskan prosedur titrasi asam-basa?', 'essay', 'Indikator PP mencapai titik ekivalen merah muda seulas.', NOW(), NOW()),
    ('q-lab9j-b-1', 'pkg-lab9j-b', 'Q-B-1', 1, 'teknis_kimia', 'Jelaskan cara kalibrasi pH meter?', 'essay', 'Menggunakan larutan buffer standar pH 4, 7, dan 10.', NOW(), NOW());

-- -----------------------------------------------------------------------------
-- 7. SETUP UJIAN SEKOLAH (Kolom: id, school_id, school_name, title, package_id, category, class_id, teacher_id, status, duration_minutes, target_score, question_snapshot)
-- CATATAN: status IN ('terjadwal', 'berjalan', 'selesai'), category NOT NULL
-- -----------------------------------------------------------------------------
INSERT INTO employa.exams (id, school_id, school_name, title, package_id, package_title, category, class_id, class_name, teacher_id, status, duration_minutes, target_score, question_snapshot, created_at, updated_at)
VALUES
    ('exam-lab9j-a', 'sch-lab9j-a', 'SMK Negeri 1 Test A (Kimia Industri)', 'Ujian Sekolah A', 'pkg-lab9j-a', 'Paket Internal Sekolah A', 'teknis_kimia', 'cls-lab9j-a1', 'XII KI 1', 'usr-lab9j-guru-a', 'berjalan', 60, 75, '[{"id": "q-lab9j-a-1"}]'::jsonb, NOW(), NOW()),
    ('exam-lab9j-b', 'sch-lab9j-b', 'SMK Negeri 2 Test B (Teknik Kimia)', 'Ujian Sekolah B', 'pkg-lab9j-b', 'Paket Internal Sekolah B', 'teknis_kimia', 'cls-lab9j-b1', 'XII TK 1', 'usr-lab9j-guru-b', 'berjalan', 60, 75, '[{"id": "q-lab9j-b-1"}]'::jsonb, NOW(), NOW());

-- -----------------------------------------------------------------------------
-- 8. SETUP SUBMISSIONS (Kolom: id, exam_id, student_id, student_name, student_nis, school_id, class_id, status, total_score, max_raw_score, is_teacher_validated, validation_status, validated_by, validated_at, teacher_score_total, answers)
-- CATATAN: student_nis (bukan student_nisn), max_raw_score (bukan max_score), status='dinilai'/'perlu_pemeriksaan', validation_status='approved'/'pending_review'
-- -----------------------------------------------------------------------------
INSERT INTO employa.submissions (id, exam_id, student_id, student_name, student_nis, school_id, class_id, status, total_score, max_raw_score, is_teacher_validated, validation_status, validated_by, validated_at, teacher_score_total, answers, created_at, updated_at)
VALUES
    ('sub-lab9j-a', 'exam-lab9j-a', 'usr-lab9j-siswa-a', 'Siswa Sekolah A', 'NISN001', 'sch-lab9j-a', 'cls-lab9j-a1', 'dinilai', 85.00, 100.00, TRUE, 'approved', 'usr-lab9j-guru-a', NOW(), 85.00, '{"q-lab9j-a-1": "jawaban siswa a"}'::jsonb, NOW(), NOW()),
    ('sub-lab9j-b', 'exam-lab9j-b', 'usr-lab9j-siswa-b', 'Siswa Sekolah B', 'NISN002', 'sch-lab9j-b', 'cls-lab9j-b1', 'perlu_pemeriksaan', 78.00, 100.00, FALSE, 'pending_review', NULL, NULL, NULL, '{"q-lab9j-b-1": "jawaban siswa b"}'::jsonb, NOW(), NOW()),
    ('sub-lab9j-legacy', 'exam-lab9j-a', 'usr-lab9j-siswa-a', 'Siswa Sekolah A', 'NISN001', NULL, NULL, 'perlu_pemeriksaan', 70.00, 100.00, FALSE, 'pending_review', NULL, NULL, NULL, '{"q-lab9j-a-1": "jawaban lama"}'::jsonb, NOW(), NOW());

-- -----------------------------------------------------------------------------
-- 9. SETUP EVIDENCE METADATA (Kolom: id, submission_id, exam_id, question_id, student_nis, student_name, modality_type, file_name, file_size, mime_type, storage_path, storage_url, file_hash, extraction_status)
-- CATATAN: modality_type (bukan evidence_type), storage_path (bukan file_path), file_size (bukan file_size_bytes)
-- -----------------------------------------------------------------------------
INSERT INTO employa.evidence_metadata (id, submission_id, exam_id, question_id, student_nis, student_name, modality_type, file_name, file_size, mime_type, storage_path, storage_url, file_hash, extraction_status, created_at, updated_at)
VALUES
    ('evi-lab9j-a', 'sub-lab9j-a', 'exam-lab9j-a', 'q-lab9j-a-1', 'NISN001', 'Siswa Sekolah A', 'image', 'sub-a.jpg', 1048576, 'image/jpeg', 'evidence/sch-a/sub-a.jpg', '/api/evidence/sch-a/sub-a.jpg', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'completed', NOW(), NOW()),
    ('evi-lab9j-b', 'sub-lab9j-b', 'exam-lab9j-b', 'q-lab9j-b-1', 'NISN002', 'Siswa Sekolah B', 'audio', 'sub-b.mp3', 2097152, 'audio/mpeg', 'evidence/sch-b/sub-b.mp3', '/api/evidence/sch-b/sub-b.mp3', 'd41d8cd98f00b204e9800998ecf8427e1234567890abcdef1234567890abcdef', 'completed', NOW(), NOW());

-- -----------------------------------------------------------------------------
-- 10. SETUP AI EVALUATION JOBS (Kolom: id, submission_id, exam_id, student_id, status, attempt_count, max_attempts, priority)
-- CATATAN: attempt_count (bukan retry_count), exam_id & student_id NOT NULL
-- -----------------------------------------------------------------------------
INSERT INTO employa.ai_evaluation_jobs (id, submission_id, exam_id, student_id, status, attempt_count, max_attempts, priority, created_at, updated_at)
VALUES
    ('job-lab9j-a', 'sub-lab9j-a', 'exam-lab9j-a', 'usr-lab9j-siswa-a', 'pending', 0, 3, 0, NOW(), NOW()),
    ('job-lab9j-b', 'sub-lab9j-b', 'exam-lab9j-b', 'usr-lab9j-siswa-b', 'pending', 0, 3, 0, NOW(), NOW());

DO $$
BEGIN
    RAISE NOTICE 'SETUP FIXTURES BERHASIL DENGAN SKEMA AKTUAL 100%% VALID.';
    RAISE NOTICE 'MEMULAI 9 SKENARIO INTEGRATION TEST KEAMANAN...';
END $$;


-- =============================================================================
-- TEST 1: ISOLASI MULTI-TENANT SUBMISSION & ELIMINASI school_id IS NULL BAGI GURU
--   - Guru A HANYA dapat melihat submission Sekolah A ('sub-lab9j-a').
--   - Submission Sekolah B ('sub-lab9j-b') dan Submission Legacy ('sub-lab9j-legacy') WAJIB TIDAK TERLIHAT.
--   - Admin dapat melihat ketiganya.
-- =============================================================================
DO $$
DECLARE
    v_count_guru_a INTEGER;
    v_has_sub_b BOOLEAN;
    v_has_sub_legacy BOOLEAN;
    v_count_admin INTEGER;
BEGIN
    RAISE NOTICE '>>> TEST 1: Pengujian Isolasi Multi-Tenant Submissions...';

    -- Simulasi Sesi Guru A
    PERFORM set_config('app.current_user_id', 'usr-lab9j-guru-a', true);

    SELECT COUNT(*) INTO v_count_guru_a
    FROM employa.submissions
    WHERE id LIKE 'sub-lab9j-%';

    SELECT EXISTS (SELECT 1 FROM employa.submissions WHERE id = 'sub-lab9j-b') INTO v_has_sub_b;
    SELECT EXISTS (SELECT 1 FROM employa.submissions WHERE id = 'sub-lab9j-legacy') INTO v_has_sub_legacy;

    IF v_count_guru_a <> 1 THEN
        RAISE EXCEPTION 'TEST 1 GAGAL: Guru A melihat % submission, seharusnya tepat 1 (hanya Sekolah A)', v_count_guru_a;
    END IF;

    IF v_has_sub_b THEN
        RAISE EXCEPTION 'TEST 1 GAGAL: KEBOCORAN DATA! Guru A dapat melihat Submission Sekolah B!';
    END IF;

    IF v_has_sub_legacy THEN
        RAISE EXCEPTION 'TEST 1 GAGAL: KEBOCORAN HISTORIS! Guru A dapat melihat Submission dengan school_id IS NULL!';
    END IF;

    -- Simulasi Sesi Admin
    PERFORM set_config('app.current_user_id', 'usr-lab9j-admin', true);
    SELECT COUNT(*) INTO v_count_admin
    FROM employa.submissions
    WHERE id LIKE 'sub-lab9j-%';

    IF v_count_admin <> 3 THEN
        RAISE EXCEPTION 'TEST 1 GAGAL: Admin seharusnya dapat melihat seluruh 3 submission (A, B, dan legacy NULL), tapi melihat %', v_count_admin;
    END IF;

    RAISE NOTICE '  [PASS] TEST 1: Guru A terisolasi sempurna pada Sekolah A; Submission B & Legacy (NULL) tersembunyi!';
END $$;


-- =============================================================================
-- TEST 2: PENUTUPAN CELAH REGISTRASI ADMIN & GURU MANDIRI (UNAUTHENTICATED)
--   - Registrasi tanpa autentikasi (app.current_user_id IS NULL) DILARANG membuat role 'admin' atau 'guru'.
--   - Percobaan INSERT dengan role 'admin' atau 'guru' wajib melemparkan Exception / ditolak RLS.
--   - Registrasi mandiri role 'siswa' diizinkan.
-- =============================================================================
DO $$
DECLARE
    v_attack_admin_blocked BOOLEAN := FALSE;
    v_attack_guru_blocked BOOLEAN := FALSE;
    v_student_reg_success BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '>>> TEST 2: Pengujian Anti-Registrasi Admin & Guru Mandiri...';

    -- Simulasi Sesi Publik Unauthenticated
    PERFORM set_config('app.current_user_id', '', true);

    -- 1. Penyerang mencoba membuat user admin mandiri
    BEGIN
        INSERT INTO employa.users (id, email, password_hash, name, role, created_at, updated_at)
        VALUES ('usr-lab9j-fakeadmin', 'hacker.admin@employa.local', '$2b$10$fake', 'Fake Admin', 'admin', NOW(), NOW());
        v_attack_admin_blocked := FALSE;
    EXCEPTION WHEN OTHERS THEN
        v_attack_admin_blocked := TRUE;
    END;

    IF NOT v_attack_admin_blocked THEN
        RAISE EXCEPTION 'TEST 2 GAGAL: Celah Registrasi Terbuka! Unauthenticated user berhasil membuat akun role admin!';
    END IF;

    -- 2. Penyerang mencoba membuat user guru mandiri
    BEGIN
        INSERT INTO employa.users (id, email, password_hash, name, role, created_at, updated_at)
        VALUES ('usr-lab9j-fakeguru', 'hacker.guru@employa.local', '$2b$10$fake', 'Fake Guru', 'guru', NOW(), NOW());
        v_attack_guru_blocked := FALSE;
    EXCEPTION WHEN OTHERS THEN
        v_attack_guru_blocked := TRUE;
    END;

    IF NOT v_attack_guru_blocked THEN
        RAISE EXCEPTION 'TEST 2 GAGAL: Celah Registrasi Terbuka! Unauthenticated user berhasil membuat akun role guru!';
    END IF;

    -- 3. Registrasi mandiri sah role siswa (diizinkan)
    BEGIN
        INSERT INTO employa.users (id, email, password_hash, name, role, school_id, created_at, updated_at)
        VALUES ('usr-lab9j-newstudent', 'newstudent@employa.local', '$2b$10$pass', 'Calon Siswa', 'siswa', 'sch-lab9j-a', NOW(), NOW());
        v_student_reg_success := TRUE;
    EXCEPTION WHEN OTHERS THEN
        v_student_reg_success := FALSE;
    END;

    IF NOT v_student_reg_success THEN
        RAISE EXCEPTION 'TEST 2 GAGAL: Registrasi mandiri sah role siswa gagal!';
    END IF;

    -- Bersihkan user siswa uji
    DELETE FROM employa.users WHERE id = 'usr-lab9j-newstudent';

    RAISE NOTICE '  [PASS] TEST 2: Celah registrasi admin/guru tertutup rapat! Percobaan ditolak exception!';
END $$;


-- =============================================================================
-- TEST 3: ANTIMANIPULASI IDENTITAS VIA SESSION VARIABLE (THREAT MODEL DEFENSE)
--   - Pembuktian bahwa employa.is_admin() memvalidasi fisik baris tabel employa.users.
--   - Jika siswa mengeksekusi SET LOCAL app.current_user_id = 'usr-lab9j-siswa-a', is_admin() = FALSE.
--   - Jika sembarang string acak disuntikkan ('random-uuid'), is_admin() = FALSE.
-- =============================================================================
DO $$
DECLARE
    v_is_admin BOOLEAN;
    v_school_id TEXT;
BEGIN
    RAISE NOTICE '>>> TEST 3: Pengujian Ketahanan Anti-Spoofing Session Parameter...';

    -- Siswa A mencoba klaim admin
    PERFORM set_config('app.current_user_id', 'usr-lab9j-siswa-a', true);
    SELECT employa.is_admin() INTO v_is_admin;
    IF v_is_admin THEN
        RAISE EXCEPTION 'TEST 3 GAGAL: Siswa A dianggap admin oleh employa.is_admin()!';
    END IF;

    -- Siswa A mencoba klaim id acak
    PERFORM set_config('app.current_user_id', 'hacked-id-not-in-db', true);
    SELECT employa.is_admin() INTO v_is_admin;
    IF v_is_admin THEN
        RAISE EXCEPTION 'TEST 3 GAGAL: ID acak dianggap admin oleh employa.is_admin()!';
    END IF;

    -- Guru A mencoba memalsukan sekolah dengan session variable custom
    PERFORM set_config('app.current_user_id', 'usr-lab9j-guru-a', true);
    PERFORM set_config('app.current_school_id', 'sch-lab9j-b', true); -- Mencoba mengaku Sekolah B
    SELECT employa.get_verified_school_id() INTO v_school_id;

    IF v_school_id <> 'sch-lab9j-a' THEN
        RAISE EXCEPTION 'TEST 3 GAGAL: employa.get_verified_school_id() tertipu parameter sesi! Hasil: %, Seharusnya: sch-lab9j-a', v_school_id;
    END IF;

    RAISE NOTICE '  [PASS] TEST 3: Model keamanan database memvalidasi tabel riil; pemalsuan parameter ditolak!';
END $$;


-- =============================================================================
-- TEST 4: PEMISAHAN ROLE FISIK & PENCEGAHAN WEB API MENYAMAR SEBAGAI AI WORKER
--   - employa.is_worker_process() memverifikasi SESSION_USER = 'employa_worker'.
--   - Role employa_app TIDAK DAPAT menyamar sebagai worker meskipun SET app.is_worker = 'true'.
--   - Role employa_worker terverifikasi secara fisik oleh SESSION_USER.
-- =============================================================================
SET SESSION AUTHORIZATION employa_app;
DO $$
DECLARE
    v_is_worker BOOLEAN;
BEGIN
    RAISE NOTICE '>>> TEST 4: Pengujian Pembatasan Koneksi Web API (employa_app)...';

    -- 1. Kondisi default role employa_app
    SELECT employa.is_worker_process() INTO v_is_worker;
    IF v_is_worker THEN
        RAISE EXCEPTION 'TEST 4 GAGAL: Koneksi employa_app dideteksi sebagai worker process!';
    END IF;

    -- 2. Mencoba memalsukan parameter app.is_worker = 'true'
    PERFORM set_config('app.is_worker', 'true', true);
    SELECT employa.is_worker_process() INTO v_is_worker;
    IF v_is_worker THEN
        RAISE EXCEPTION 'TEST 4 GAGAL: Celah Identifikasi Worker! employa_app berhasil memalsukan diri via app.is_worker!';
    END IF;

    RAISE NOTICE '  [PASS] TEST 4A: Koneksi Web API (employa_app) dilarang mutlak menyamar sebagai AI Worker!';
END $$;
RESET SESSION AUTHORIZATION;

SET SESSION AUTHORIZATION employa_worker;
DO $$
DECLARE
    v_is_worker BOOLEAN;
BEGIN
    -- Verifikasi bahwa worker asli dikenali secara mutlak via SESSION_USER
    SELECT employa.is_worker_process() INTO v_is_worker;
    IF NOT v_is_worker THEN
        RAISE EXCEPTION 'TEST 4 GAGAL: Role employa_worker yang sah tidak dikenali oleh employa.is_worker_process()!';
    END IF;

    RAISE NOTICE '  [PASS] TEST 4B: Role employa_worker yang sah terverifikasi 100%% via SESSION_USER!';
END $$;
RESET SESSION AUTHORIZATION;


-- =============================================================================
-- TEST 5: PROTEKSI NILAI FINAL GURU TERHADAP OVERWRITE AI WORKER
--   - Submission 'sub-lab9j-a' telah divalidasi oleh Guru A (is_teacher_validated = TRUE, score = 85.00).
--   - Ketika role employa_worker menyelesaikan pekerjaan dan memperbarui baris submission:
--     1. Nilai teacher_score_total dan total_score TETAP 85.00 (TIDAK BOLEH DITIMPA).
--     2. Status is_teacher_validated TETAP TRUE.
--     3. Status validation_status TETAP 'approved'.
--   - Percobaan unvalidation ilegal (is_teacher_validated = FALSE) melempar exception.
-- =============================================================================
SET SESSION AUTHORIZATION employa_worker;
DO $$
DECLARE
    v_row RECORD;
    v_unvalidate_blocked BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '>>> TEST 5: Pengujian Proteksi Nilai Final Guru terhadap AI Worker...';

    -- Worker memperbarui status AI grading
    UPDATE employa.submissions
    SET ai_grading_status = 'completed',
        original_ai_score_total = 92.50,
        total_score = 92.50 -- Worker mencoba menimpa total_score
    WHERE id = 'sub-lab9j-a';

    -- Periksa apakah trigger mempertahankan nilai guru
    SELECT total_score, teacher_score_total, is_teacher_validated, validation_status
    INTO v_row
    FROM employa.submissions
    WHERE id = 'sub-lab9j-a';

    IF v_row.total_score <> 85.00 THEN
        RAISE EXCEPTION 'TEST 5 GAGAL: total_score tertimpa oleh AI! Nilai saat ini: %, Seharusnya: 85.00', v_row.total_score;
    END IF;

    IF v_row.teacher_score_total <> 85.00 THEN
        RAISE EXCEPTION 'TEST 5 GAGAL: teacher_score_total berubah! Seharusnya tetap 85.00';
    END IF;

    IF v_row.is_teacher_validated <> TRUE THEN
        RAISE EXCEPTION 'TEST 5 GAGAL: is_teacher_validated berubah!';
    END IF;

    IF v_row.validation_status <> 'approved' THEN
        RAISE EXCEPTION 'TEST 5 GAGAL: validation_status tertimpa oleh worker!';
    END IF;

    -- Worker atau user mencoba unvalidate secara ilegal
    BEGIN
        UPDATE employa.submissions
        SET is_teacher_validated = FALSE
        WHERE id = 'sub-lab9j-a';
        v_unvalidate_blocked := FALSE;
    EXCEPTION WHEN OTHERS THEN
        v_unvalidate_blocked := TRUE;
    END;

    IF NOT v_unvalidate_blocked THEN
        RAISE EXCEPTION 'TEST 5 GAGAL: Submission tervalidasi berhasil di-unvalidate secara ilegal!';
    END IF;

    RAISE NOTICE '  [PASS] TEST 5: Nilai guru dan status validasi terlindungi mutlak dari overwrite AI Worker!';
END $$;
RESET SESSION AUTHORIZATION;


-- =============================================================================
-- TEST 6: PROTEKSI HASH PASSWORD & BANK SOAL DARI SISWA
--   - Role employa_app DILARANG melakukan SELECT bebas pada kolom password_hash tabel users.
--   - employa.authenticate_user(email) hanya dapat diakses melalui fungsi khusus backend.
--   - Siswa DILARANG membaca langsung tabel packages dan questions (kunci jawaban & rubrik).
-- =============================================================================
SET SESSION AUTHORIZATION employa_app;
DO $$
DECLARE
    v_pwd_select_blocked BOOLEAN := FALSE;
    v_auth_hash TEXT;
    v_questions_count INTEGER;
    v_packages_count INTEGER;
BEGIN
    RAISE NOTICE '>>> TEST 6: Pengujian Proteksi Password Hash & Bank Soal...';

    -- 1. Uji SELECT bebas kolom password_hash oleh employa_app (Wajib permission denied / insufficient privilege)
    BEGIN
        EXECUTE 'SELECT password_hash FROM employa.users LIMIT 1';
        v_pwd_select_blocked := FALSE;
    EXCEPTION
        WHEN insufficient_privilege THEN
            v_pwd_select_blocked := TRUE;
        WHEN OTHERS THEN
            v_pwd_select_blocked := TRUE;
    END;

    IF NOT v_pwd_select_blocked THEN
        RAISE EXCEPTION 'TEST 6 GAGAL: Celah Keamanan! employa_app dapat melakukan SELECT bebas pada kolom password_hash!';
    END IF;

    -- 2. Uji fungsi khusus backend authenticate_user (Diizinkan untuk Express login)
    SELECT password_hash INTO v_auth_hash
    FROM employa.authenticate_user('guru.a@employa.local');

    IF v_auth_hash IS NULL OR v_auth_hash NOT LIKE '$2b$%' THEN
        RAISE EXCEPTION 'TEST 6 GAGAL: employa.authenticate_user tidak mengembalikan hash yang valid untuk login!';
    END IF;

    -- 3. Uji Siswa membaca tabel questions & packages (Wajib menghasilkan 0 baris via RLS)
    PERFORM set_config('app.current_user_id', 'usr-lab9j-siswa-a', true);

    SELECT COUNT(*) INTO v_questions_count FROM employa.questions;
    IF v_questions_count <> 0 THEN
        RAISE EXCEPTION 'TEST 6 GAGAL: Siswa dapat membaca % butir soal langsung dari database!', v_questions_count;
    END IF;

    SELECT COUNT(*) INTO v_packages_count FROM employa.packages;
    IF v_packages_count <> 0 THEN
        RAISE EXCEPTION 'TEST 6 GAGAL: Siswa dapat membaca % paket soal langsung dari database!', v_packages_count;
    END IF;

    RAISE NOTICE '  [PASS] TEST 6: Hash password terlindungi dari SELECT bebas; Bank soal & kunci jawaban tertutup bagi siswa!';
END $$;
RESET SESSION AUTHORIZATION;


-- =============================================================================
-- TEST 7: ISOLASI AI EVALUATION JOBS ANTAR SEKOLAH
--   - Guru A HANYA dapat melihat job Sekolah A ('job-lab9j-a').
--   - Guru A TIDAK DAPAT melihat atau memodifikasi job Sekolah B ('job-lab9j-b').
-- =============================================================================
SET SESSION AUTHORIZATION employa_app;
DO $$
DECLARE
    v_jobs_count INTEGER;
    v_can_see_b BOOLEAN;
    v_tamper_count INTEGER;
BEGIN
    RAISE NOTICE '>>> TEST 7: Pengujian Isolasi AI Jobs Antar Sekolah...';

    PERFORM set_config('app.current_user_id', 'usr-lab9j-guru-a', true);

    SELECT COUNT(*) INTO v_jobs_count
    FROM employa.ai_evaluation_jobs
    WHERE id LIKE 'job-lab9j-%';

    SELECT EXISTS (SELECT 1 FROM employa.ai_evaluation_jobs WHERE id = 'job-lab9j-b') INTO v_can_see_b;

    IF v_can_see_b THEN
        RAISE EXCEPTION 'TEST 7 GAGAL: KEBOCORAN! Guru A dapat melihat AI Evaluation Job milik Sekolah B!';
    END IF;

    -- Guru A mencoba memodifikasi status job Sekolah B
    UPDATE employa.ai_evaluation_jobs
    SET status = 'failed'
    WHERE id = 'job-lab9j-b';

    GET DIAGNOSTICS v_tamper_count = ROW_COUNT;
    IF v_tamper_count > 0 THEN
        RAISE EXCEPTION 'TEST 7 GAGAL: Guru A berhasil memodifikasi % job milik Sekolah B!', v_tamper_count;
    END IF;

    RAISE NOTICE '  [PASS] TEST 7: Guru terisolasi dari antrean AI job sekolah lain (0 baris terbaca/terubah)!';
END $$;
RESET SESSION AUTHORIZATION;


-- =============================================================================
-- TEST 8: PROTEKSI BANK SOAL ANTAR SEKOLAH & PAKET SISTEM
--   - Guru A TIDAK DAPAT memodifikasi paket soal Sekolah B ('pkg-lab9j-b').
--   - Guru A TIDAK DAPAT memodifikasi paket standar nasional sistem ('pkg-lab9j-system' di mana created_by IS NULL).
--   - Guru A TIDAK DAPAT mengubah butir soal milik Sekolah B ('q-lab9j-b-1') atau paket sistem.
-- =============================================================================
SET SESSION AUTHORIZATION employa_app;
DO $$
DECLARE
    v_updated INTEGER;
BEGIN
    RAISE NOTICE '>>> TEST 8: Pengujian Proteksi Paket & Butir Soal Antar Sekolah...';

    PERFORM set_config('app.current_user_id', 'usr-lab9j-guru-a', true);

    -- 1. Guru A mencoba mengubah judul paket Sekolah B
    UPDATE employa.packages
    SET title = 'Dibajak Guru A'
    WHERE id = 'pkg-lab9j-b';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
        RAISE EXCEPTION 'TEST 8 GAGAL: Guru A berhasil memodifikasi paket milik Sekolah B!';
    END IF;

    -- 2. Guru A mencoba mengubah paket sistem (created_by IS NULL)
    UPDATE employa.packages
    SET title = 'Paket Sistem Dibajak'
    WHERE id = 'pkg-lab9j-system';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
        RAISE EXCEPTION 'TEST 8 GAGAL: Guru A berhasil memodifikasi paket sistem nasional!';
    END IF;

    -- 3. Guru A mencoba mengubah butir soal Sekolah B (kolom question_text)
    UPDATE employa.questions
    SET question_text = 'Soal Sekolah B diubah'
    WHERE id = 'q-lab9j-b-1';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
        RAISE EXCEPTION 'TEST 8 GAGAL: Guru A berhasil memodifikasi butir soal milik Sekolah B!';
    END IF;

    RAISE NOTICE '  [PASS] TEST 8: Paket soal & butir soal sekolah lain serta paket sistem terlindungi dari modifikasi guru!';
END $$;
RESET SESSION AUTHORIZATION;


-- =============================================================================
-- TEST 9: INTEGRITAS KEPEMILIKAN EVIDENCE METADATA
--   - Siswa A HANYA dapat mengunggah bukti pada submission miliknya ('sub-lab9j-a').
--   - Siswa A DILARANG mengunggah bukti pada submission Siswa B ('sub-lab9j-b').
--   - Guru A HANYA dapat melihat bukti submission dari Sekolah A.
-- =============================================================================
SET SESSION AUTHORIZATION employa_app;
DO $$
DECLARE
    v_upload_attack_blocked BOOLEAN := FALSE;
    v_can_see_evidence_b BOOLEAN;
BEGIN
    RAISE NOTICE '>>> TEST 9: Pengujian Integritas Bukti Multimodal (evidence_metadata)...';

    -- 1. Siswa A mencoba mengunggah evidence ke submission Siswa B
    PERFORM set_config('app.current_user_id', 'usr-lab9j-siswa-a', true);

    BEGIN
        INSERT INTO employa.evidence_metadata (
            id, submission_id, exam_id, question_id, student_nis, student_name,
            modality_type, file_name, file_size, mime_type, storage_path, storage_url,
            file_hash, extraction_status, created_at, updated_at
        ) VALUES (
            'evi-fake-tamper', 'sub-lab9j-b', 'exam-lab9j-b', 'q-lab9j-b-1', 'NISN001', 'Siswa Sekolah A',
            'image', 'fake.jpg', 1000, 'image/jpeg', 'evidence/fake.jpg', '/api/evidence/fake.jpg',
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'saved', NOW(), NOW()
        );
        v_upload_attack_blocked := FALSE;
    EXCEPTION WHEN OTHERS THEN
        v_upload_attack_blocked := TRUE;
    END;

    IF NOT v_upload_attack_blocked THEN
        RAISE EXCEPTION 'TEST 9 GAGAL: Siswa A berhasil menyuntikkan bukti ke submission Siswa B!';
    END IF;

    -- 2. Guru A melihat evidence Sekolah B
    PERFORM set_config('app.current_user_id', 'usr-lab9j-guru-a', true);

    SELECT EXISTS (SELECT 1 FROM employa.evidence_metadata WHERE id = 'evi-lab9j-b') INTO v_can_see_evidence_b;
    IF v_can_see_evidence_b THEN
        RAISE EXCEPTION 'TEST 9 GAGAL: KEBOCORAN BUKTI! Guru A dapat melihat metadata bukti milik Sekolah B!';
    END IF;

    RAISE NOTICE '  [PASS] TEST 9: Bukti multimodal terikat ketat pada kepemilikan submission dan sekolah yang sah!';
END $$;
RESET SESSION AUTHORIZATION;


-- =============================================================================
-- REKAPITULASI SEBELUM ROLLBACK
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'HASIL INTEGRATION TEST POSTGRESQL 17 TAHAP 9Q:';
    RAISE NOTICE 'SELURUH 9 SKENARIO KEAMANAN DAN RLS HARDENING LULUS 100%%!';
    RAISE NOTICE '  1. Isolasi Guru A & Penutupan Kebocoran school_id IS NULL: LULUS';
    RAISE NOTICE '  2. Penutupan Celah Registrasi Admin/Guru Mandiri:         LULUS';
    RAISE NOTICE '  3. Anti-Spoofing Session Parameter via Database Truth:     LULUS';
    RAISE NOTICE '  4. Pemisahan Fisik Role & Anti-Impersonasi Worker:        LULUS';
    RAISE NOTICE '  5. Proteksi Nilai Final Guru terhadap Overwrite AI:       LULUS';
    RAISE NOTICE '  6. Proteksi Hash Password & Isolasi Bank Soal Siswa:      LULUS';
    RAISE NOTICE '  7. Isolasi Antrean AI Evaluation Jobs Antar Sekolah:      LULUS';
    RAISE NOTICE '  8. Proteksi Bank Soal Sekolah Lain & Paket Sistem:        LULUS';
    RAISE NOTICE '  9. Integritas Kepemilikan Bukti Multimodal:               LULUS';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'MELAKUKAN ROLLBACK TRANSAKSI AGAR BASIS DATA BERSIH DARI FIXTURES.';
END $$;

-- =============================================================================
-- ROLLBACK TRANSAKSI: Menjamin tidak ada residu data fixtures di basis data
-- =============================================================================
ROLLBACK;
