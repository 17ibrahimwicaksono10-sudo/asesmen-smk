-- =============================================================================
-- SISTEM ASESMEN & PROFIL KESIAPAN KERJA SISWA SMK (EMPLOYASKILLS)
-- Migration 001: Initial Production-Grade Schema in Dedicated Internal Schema
-- Target: Supabase PostgreSQL 17.x (Singapore ap-southeast-1)
-- Schema: employa (Terisolasi dari PostgREST public Data API)
-- =============================================================================

-- 1. BUAT SCHEMA INTERNAL 'employa'
-- Menjamin isolasi penuh dari eksposur publik PostgREST Supabase
CREATE SCHEMA IF NOT EXISTS employa;

-- Set search_path agar operasi berikutnya berada dalam namespace employa
SET search_path TO employa, public;

-- Enable extensions standar di schema public / extensions jika belum ada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;

-- =============================================================================
-- 0. SCHEMA MIGRATION TRACKING TABLE
-- Menjamin migration berversi dan idempoten tanpa duplikasi eksekusi
-- =============================================================================
CREATE TABLE IF NOT EXISTS employa.schema_migrations (
    version     VARCHAR(50) PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum    VARCHAR(64) NOT NULL
);

-- =============================================================================
-- 1. SCHOOLS (Sekolah Multi-Tenant)
-- =============================================================================
CREATE TABLE IF NOT EXISTS employa.schools (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    code            TEXT UNIQUE NOT NULL,
    address         TEXT,
    total_classes   INTEGER NOT NULL DEFAULT 0,
    total_teachers  INTEGER NOT NULL DEFAULT 0,
    total_students  INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ NULL
);

-- =============================================================================
-- 2. USERS (Admin, Guru, Siswa)
-- Mendukung siswa mandiri / tanpa sekolah awal (school_id NULL)
-- =============================================================================
CREATE TABLE IF NOT EXISTS employa.users (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    email               TEXT UNIQUE NOT NULL,
    role                TEXT NOT NULL CHECK (role IN ('admin', 'guru', 'siswa')),
    identity_no         TEXT, -- NIS (siswa) atau NIP (guru/admin)
    school_id           TEXT REFERENCES employa.schools(id) ON DELETE SET NULL,
    school_name         TEXT,
    class_id            TEXT, -- FK ditambahkan setelah tabel classes dibuat
    class_name          TEXT,
    target_job_title    TEXT,
    phone               TEXT,
    password_hash       TEXT,
    assigned_class_ids  JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ NULL
);

-- =============================================================================
-- 3. CLASSES (Kelas Akademik)
-- =============================================================================
CREATE TABLE IF NOT EXISTS employa.classes (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    school_id       TEXT REFERENCES employa.schools(id) ON DELETE RESTRICT,
    school_name     TEXT,
    teacher_id      TEXT REFERENCES employa.users(id) ON DELETE SET NULL,
    teacher_name    TEXT,
    academic_year   TEXT,
    student_count   INTEGER NOT NULL DEFAULT 0,
    exam_count      INTEGER NOT NULL DEFAULT 0,
    class_code      TEXT UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ NULL
);

-- Tambahkan foreign key class_id pada users (ON DELETE SET NULL untuk menjaga siswa tidak terhapus)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_class'
    ) THEN
        ALTER TABLE employa.users
            ADD CONSTRAINT fk_users_class
            FOREIGN KEY (class_id) REFERENCES employa.classes(id) ON DELETE SET NULL
            NOT VALID;
    END IF;
END $$;

-- =============================================================================
-- 4. TEACHER ASSIGNED CLASSES (Relasi Multi-Kelas Guru)
-- =============================================================================
CREATE TABLE IF NOT EXISTS employa.teacher_assigned_classes (
    teacher_id  TEXT NOT NULL REFERENCES employa.users(id) ON DELETE RESTRICT,
    class_id    TEXT NOT NULL REFERENCES employa.classes(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (teacher_id, class_id)
);

-- =============================================================================
-- 5. QUESTION PACKAGES (Paket Soal Induk)
-- Kode paket tidak di-UNIQUE-kan ketat karena paket versi guru dapat menggunakan kode dasar yang sama
-- =============================================================================
CREATE TABLE IF NOT EXISTS employa.packages (
    id                  TEXT PRIMARY KEY,
    code                TEXT NOT NULL,
    title               TEXT NOT NULL,
    description         TEXT,
    category            TEXT NOT NULL CHECK (category IN ('teknis_kimia', 'employability')),
    duration_minutes    INTEGER NOT NULL DEFAULT 60,
    total_questions     INTEGER NOT NULL DEFAULT 0,
    questions           JSONB NOT NULL DEFAULT '[]'::jsonb, -- Snapshot butir soal & rubrik
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    version             INTEGER NOT NULL DEFAULT 1,
    created_at_date     DATE,
    created_by          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ NULL
);

-- =============================================================================
-- 6. QUESTIONS (Relational Question Items per Package)
-- Memfasilitasi query butir individual, relasi rubrik, dan analisis item
-- =============================================================================
CREATE TABLE IF NOT EXISTS employa.questions (
    id                      TEXT PRIMARY KEY,
    package_id              TEXT NOT NULL REFERENCES employa.packages(id) ON DELETE RESTRICT,
    code                    TEXT,
    number                  INTEGER,
    category                TEXT NOT NULL,
    dimension_id            TEXT,
    dimension_name          TEXT,
    aspect_id               TEXT,
    aspect_name             TEXT,
    topic                   TEXT,
    indicator               TEXT,
    context                 TEXT,
    cognitive_level         TEXT,
    stimulus                TEXT,
    question_text           TEXT NOT NULL,
    type                    TEXT NOT NULL,
    options                 JSONB,
    correct_answer          TEXT,
    correct_answers         JSONB,
    statements              JSONB,
    matching_col_a          JSONB,
    matching_col_b          JSONB,
    short_answer_key        TEXT,
    short_answer_key2       TEXT,
    unit                    TEXT,
    calculation_prompt      TEXT,
    sample_answer           TEXT,
    rubric_guide            TEXT,
    rubric_components       JSONB,
    sub_questions           JSONB,
    points                  INTEGER,
    max_score               INTEGER,
    requires_multimodal     BOOLEAN NOT NULL DEFAULT FALSE,
    allowed_evidence_types  JSONB,
    instructions            TEXT,
    context_text            TEXT,
    data_tables             JSONB,
    scoring_map             JSONB,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 7. EXAMS (Jadwal & Sesi Pelaksanaan Asesmen)
-- Mempertahankan question_snapshot untuk imutabilitas ujian saat berjalan
-- =============================================================================
CREATE TABLE IF NOT EXISTS employa.exams (
    id                  TEXT PRIMARY KEY,
    title               TEXT NOT NULL,
    package_id          TEXT REFERENCES employa.packages(id) ON DELETE SET NULL,
    package_title       TEXT,
    package_version     INTEGER NOT NULL DEFAULT 1,
    question_snapshot   JSONB, -- Snapshot butir soal pada waktu ujian dibuat
    category            TEXT NOT NULL CHECK (category IN ('teknis_kimia', 'employability')),
    class_id            TEXT REFERENCES employa.classes(id) ON DELETE SET NULL,
    class_name          TEXT,
    school_id           TEXT REFERENCES employa.schools(id) ON DELETE SET NULL,
    school_name         TEXT,
    teacher_id          TEXT REFERENCES employa.users(id) ON DELETE SET NULL,
    teacher_name        TEXT,
    schedule_date       DATE,
    start_time          TIME,
    end_time            TIME,
    duration_minutes    INTEGER NOT NULL DEFAULT 60,
    target_score        INTEGER NOT NULL DEFAULT 75,
    status              TEXT NOT NULL DEFAULT 'terjadwal' CHECK (status IN ('terjadwal', 'berjalan', 'selesai')),
    randomize_questions BOOLEAN NOT NULL DEFAULT FALSE,
    total_students      INTEGER NOT NULL DEFAULT 0,
    completed_students  INTEGER NOT NULL DEFAULT 0,
    ai_grading_status   TEXT CHECK (ai_grading_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ NULL
);

-- Trigger untuk melindungi imutabilitas snapshot soal pada ujian berjalan/selesai
CREATE OR REPLACE FUNCTION employa.protect_exam_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('berjalan', 'selesai') THEN
        IF OLD.question_snapshot IS NOT NULL AND NEW.question_snapshot IS DISTINCT FROM OLD.question_snapshot THEN
            IF COALESCE(current_setting('app.allow_snapshot_override', true), 'false') != 'true' THEN
                RAISE EXCEPTION 'Pelanggaran Integritas Akademik: Butir soal dan rubrik (question_snapshot) pada ujian yang berstatus "%" tidak boleh diubah!', OLD.status;
            END IF;
        END IF;
        IF NEW.package_id IS DISTINCT FROM OLD.package_id THEN
            RAISE EXCEPTION 'Pelanggaran Integritas Akademik: Paket soal induk tidak boleh diganti saat ujian berstatus "%"!', OLD.status;
        END IF;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_exam_snapshot ON employa.exams;
CREATE TRIGGER trg_protect_exam_snapshot
    BEFORE UPDATE ON employa.exams
    FOR EACH ROW
    EXECUTE FUNCTION employa.protect_exam_snapshot();

-- =============================================================================
-- 8. SUBMISSIONS (Hasil Pengerjaan Siswa & Status Penilaian)
-- Nilai maksimum DINAMIS (tanpa DEFAULT 65!), foreign key RESTRICT/SET NULL
-- =============================================================================
CREATE TABLE IF NOT EXISTS employa.submissions (
    id                      TEXT PRIMARY KEY,
    exam_id                 TEXT REFERENCES employa.exams(id) ON DELETE SET NULL,
    exam_title              TEXT,
    package_id              TEXT REFERENCES employa.packages(id) ON DELETE SET NULL,
    package_title           TEXT,
    package_version         INTEGER,
    question_snapshot       JSONB, -- Snapshot butir soal dan rubrik saat siswa submit
    student_id              TEXT REFERENCES employa.users(id) ON DELETE SET NULL,
    student_name            TEXT,
    student_nis             TEXT,
    student_email           TEXT, -- Kompatibel data historis nullable
    school_id               TEXT REFERENCES employa.schools(id) ON DELETE SET NULL,
    school_name             TEXT,
    class_id                TEXT REFERENCES employa.classes(id) ON DELETE SET NULL,
    class_name              TEXT,
    submit_time             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attempt_number          INTEGER NOT NULL DEFAULT 1,
    allow_retake            BOOLEAN NOT NULL DEFAULT FALSE,
    answers                 JSONB NOT NULL DEFAULT '{}'::jsonb, -- PGK, matching, essay, audio transcript
    total_score             NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    raw_score_total         NUMERIC(6,2),
    max_raw_score           NUMERIC(6,2), -- Dihitung dinamis dari paket/snapshot (contoh: 60, 65, 90, 100)
    technical_score         NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    employability_score     NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    auto_score              NUMERIC(6,2),
    essay_score             NUMERIC(6,2),
    original_ai_score_total NUMERIC(6,2), -- Skor mentah AI untuk pembandingan audit
    teacher_score_total     NUMERIC(6,2), -- Skor final guru manusia
    has_pending_components  BOOLEAN NOT NULL DEFAULT FALSE,
    is_score_final          BOOLEAN NOT NULL DEFAULT FALSE,
    is_teacher_validated    BOOLEAN NOT NULL DEFAULT FALSE,
    teacher_notes           TEXT,
    status                  TEXT NOT NULL DEFAULT 'perlu_pemeriksaan' CHECK (status IN ('perlu_pemeriksaan', 'dinilai', 'menunggu')),
    validation_status       TEXT NOT NULL DEFAULT 'pending_review' CHECK (validation_status IN ('pending_review', 'approved', 'revised', 'returned')),
    validated_by            TEXT,
    validated_at            TIMESTAMPTZ,
    ai_grading_status       TEXT CHECK (ai_grading_status IN ('pending', 'processing', 'completed', 'failed')),
    ai_graded_at            TIMESTAMPTZ,
    ai_grading_attempts     INTEGER NOT NULL DEFAULT 0,
    ai_grading_last_attempt_at TIMESTAMPTZ,
    ai_grading_next_retry_at   TIMESTAMPTZ,
    ai_grading_error        TEXT,
    ai_grading_locked_at    TIMESTAMPTZ,
    teacher_follow_up       TEXT,
    ai_evaluation           TEXT,
    evidences               JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_scoring_summary      JSONB NOT NULL DEFAULT '{}'::jsonb,
    requires_teacher_review BOOLEAN NOT NULL DEFAULT FALSE,
    correction_time_seconds INTEGER,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ NULL
);

-- PARTIAL UNIQUE INDEX: Mencegah submission ganda pada kombinasi ujian, siswa, dan attempt_number.
-- Mempertahankan kompatibilitas data historis yang belum memiliki studentId / examId lengkap.
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_unique_attempt
    ON employa.submissions (exam_id, student_id, attempt_number)
    WHERE exam_id IS NOT NULL AND student_id IS NOT NULL;

-- =============================================================================
-- 9. TEACHER EDIT LOGS (Audit Jejak Validasi & Override Guru)
-- original_ai_score NULLABLE agar mendukung validasi manual guru tanpa penilaian AI
-- =============================================================================
CREATE TABLE IF NOT EXISTS employa.teacher_edit_logs (
    id                  TEXT PRIMARY KEY,
    submission_id       TEXT REFERENCES employa.submissions(id) ON DELETE SET NULL,
    exam_id             TEXT REFERENCES employa.exams(id) ON DELETE SET NULL,
    question_id         TEXT NOT NULL,
    student_nis         TEXT NOT NULL,
    student_name        TEXT NOT NULL,
    original_ai_score   NUMERIC(6,2) NULL, -- Kompatibel jika penilaian dilakukan manual tanpa AI
    final_teacher_score NUMERIC(6,2) NOT NULL,
    teacher_id          TEXT REFERENCES employa.users(id) ON DELETE SET NULL,
    teacher_name        TEXT NOT NULL,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action_taken        TEXT NOT NULL CHECK (action_taken IN ('approve', 'revise', 'return')),
    reason              TEXT NOT NULL,
    indicator_changes   JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 10. EVIDENCE METADATA (Registri Bukti Multimedia & SHA-256 Tamper-Evident)
-- Menyimpan pointer storage path privat permanen (DILARANG menyimpan signed URL kedaluwarsa)
-- =============================================================================
CREATE TABLE IF NOT EXISTS employa.evidence_metadata (
    id                      TEXT PRIMARY KEY,
    submission_id           TEXT REFERENCES employa.submissions(id) ON DELETE SET NULL,
    exam_id                 TEXT REFERENCES employa.exams(id) ON DELETE SET NULL,
    question_id             TEXT NOT NULL,
    student_nis             TEXT NOT NULL,
    student_name            TEXT NOT NULL,
    modality_type           TEXT NOT NULL CHECK (modality_type IN ('audio', 'handwriting', 'document', 'tulisan_tangan', 'image')),
    file_name               TEXT NOT NULL,
    file_size               BIGINT NOT NULL,
    mime_type               TEXT NOT NULL,
    storage_path            TEXT NOT NULL, -- Canonical path dalam private bucket
    storage_url             TEXT NOT NULL, -- Endpoint internal permanen (bukan signed URL)
    file_hash               VARCHAR(64) NOT NULL, -- SHA-256 cryptographic checksum
    audio_duration_seconds  NUMERIC(8,2),
    is_archived             BOOLEAN NOT NULL DEFAULT TRUE,
    upload_time             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    extraction_artifact     JSONB,
    extracted_text          TEXT,
    extraction_status       TEXT NOT NULL DEFAULT 'saved' CHECK (extraction_status IN ('saved', 'pending', 'completed', 'failed', 'extraction_failed', 'warning')),
    quality_status          TEXT CHECK (quality_status IN ('pass', 'warning', 'fail')),
    quality_issues          JSONB NOT NULL DEFAULT '[]'::jsonb,
    unreadable_flags        JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_evidence_storage_path CHECK (storage_path !~* '^https?://'),
    CONSTRAINT chk_evidence_storage_no_ephemeral_token CHECK (storage_url !~* 'token=')
);

-- =============================================================================
-- 11. EXAM DRAFTS (Autosave & Status Ujian Siswa Berjalan)
-- Transient record yang aman diperbarui tiap interval autosave
-- =============================================================================
CREATE TABLE IF NOT EXISTS employa.exam_drafts (
    id                      TEXT PRIMARY KEY,
    exam_id                 TEXT NOT NULL REFERENCES employa.exams(id) ON DELETE CASCADE,
    student_id              TEXT NOT NULL REFERENCES employa.users(id) ON DELETE CASCADE,
    student_nis             TEXT NOT NULL,
    answers                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    time_remaining_seconds  INTEGER,
    last_saved_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_draft_exam_student UNIQUE (exam_id, student_id)
);

-- =============================================================================
-- 12. AI EVALUATION JOBS (Antrean Job Penilaian AI Persisten)
-- Mendukung atomic claim (SKIP LOCKED), idempotensi, dan anti-duplikasi aktif
-- =============================================================================
CREATE TABLE IF NOT EXISTS employa.ai_evaluation_jobs (
    id              TEXT PRIMARY KEY,
    submission_id   TEXT NOT NULL REFERENCES employa.submissions(id) ON DELETE RESTRICT,
    exam_id         TEXT NOT NULL REFERENCES employa.exams(id) ON DELETE RESTRICT,
    student_id      TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    attempt_count   INTEGER NOT NULL DEFAULT 0,
    max_attempts    INTEGER NOT NULL DEFAULT 3,
    priority        INTEGER NOT NULL DEFAULT 0,
    locked_at       TIMESTAMPTZ NULL,
    locked_by       TEXT NULL,
    last_error      TEXT NULL,
    scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial Unique Index: Hanya boleh ADA SATU job berstatus aktif (pending/processing) per submission.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_jobs_single_active_per_submission
    ON employa.ai_evaluation_jobs (submission_id)
    WHERE status IN ('pending', 'processing');

-- =============================================================================
-- 13. PORTFOLIOS (Portofolio Bukti Kesiapan Kerja Siswa)
-- Mendukung kategori fleksibel sesuai types.ts dan entitas masa depan
-- =============================================================================
CREATE TABLE IF NOT EXISTS employa.portfolios (
    id                      TEXT PRIMARY KEY,
    student_id              TEXT NOT NULL REFERENCES employa.users(id) ON DELETE RESTRICT,
    title                   TEXT NOT NULL,
    category                TEXT NOT NULL CHECK (category IN ('sertifikat', 'pkl', 'proyek', 'uji_kompetensi', 'laporan_praktikum', 'lainnya')),
    issuer                  TEXT NOT NULL,
    date                    DATE NOT NULL,
    description             TEXT,
    file_url                TEXT,
    file_name               TEXT,
    file_size               BIGINT,
    target_job_title        TEXT,
    ai_score                NUMERIC(5,2),
    ai_relevance            TEXT CHECK (ai_relevance IN ('Sangat Tinggi', 'Tinggi', 'Cukup', 'Dasar', 'Rendah')),
    ai_feedback             TEXT,
    ai_evaluated_at         TIMESTAMPTZ,
    ai_key_skills           JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_verified             BOOLEAN NOT NULL DEFAULT FALSE,
    is_validated_by_teacher BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by_teacher     TEXT,
    validated_at            TIMESTAMPTZ,
    teacher_notes           TEXT,
    linked_evidence_id      TEXT,
    practicum_topic         TEXT,
    grade_score             NUMERIC(5,2),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ NULL
);

-- =============================================================================
-- 14. STUDENT READINESS PROFILES (Profil Kesiapan Kerja & Analisis AI)
-- =============================================================================
CREATE TABLE IF NOT EXISTS employa.student_readiness_profiles (
    id                      TEXT PRIMARY KEY,
    student_id              TEXT NOT NULL REFERENCES employa.users(id) ON DELETE RESTRICT,
    student_name            TEXT NOT NULL,
    student_nis             TEXT NOT NULL,
    target_job_id           TEXT NOT NULL,
    target_job_title        TEXT NOT NULL,
    ai_result               JSONB,
    deep_profile_result     JSONB,
    ai_provider             TEXT,
    deep_profile_provider   TEXT,
    is_teacher_validated    BOOLEAN NOT NULL DEFAULT FALSE,
    teacher_approval_status TEXT CHECK (teacher_approval_status IN ('approved', 'revised', 'rejected')),
    teacher_notes           TEXT,
    validated_by            TEXT,
    validated_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 15. ARCHIVES (Data Diarsipkan - Paket, Ujian, Pengguna)
-- =============================================================================
CREATE TABLE IF NOT EXISTS employa.archives (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL CHECK (type IN ('paket_soal', 'ujian', 'pengguna')),
    title       TEXT NOT NULL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason      TEXT NOT NULL,
    school_id   TEXT REFERENCES employa.schools(id) ON DELETE SET NULL,
    data        JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 16. SYSTEM SETTINGS (Pengaturan Sistem Non-Rahasia)
-- API keys dan rahasia dilarang disimpan di tabel ini!
-- =============================================================================
CREATE TABLE IF NOT EXISTS employa.system_settings (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL,
    description TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 17. PERFORMANCE & MULTI-TENANCY INDEXES
-- Mengoptimalkan query berdasar sekolah, kelas, siswa, dan pencarian bukti
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email                ON employa.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role                 ON employa.users(role);
CREATE INDEX IF NOT EXISTS idx_users_school_id            ON employa.users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_class_id             ON employa.users(class_id);
CREATE INDEX IF NOT EXISTS idx_users_identity_no          ON employa.users(identity_no);

CREATE INDEX IF NOT EXISTS idx_classes_school_id          ON employa.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id         ON employa.classes(teacher_id);

CREATE INDEX IF NOT EXISTS idx_packages_code              ON employa.packages(code);
CREATE INDEX IF NOT EXISTS idx_packages_category          ON employa.packages(category);

CREATE INDEX IF NOT EXISTS idx_questions_package_id       ON employa.questions(package_id);
CREATE INDEX IF NOT EXISTS idx_questions_category         ON employa.questions(category);

CREATE INDEX IF NOT EXISTS idx_exams_school_id            ON employa.exams(school_id);
CREATE INDEX IF NOT EXISTS idx_exams_class_id             ON employa.exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_package_id           ON employa.exams(package_id);
CREATE INDEX IF NOT EXISTS idx_exams_status               ON employa.exams(status);

CREATE INDEX IF NOT EXISTS idx_submissions_exam_id        ON employa.submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id     ON employa.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_school_id      ON employa.submissions(school_id);
CREATE INDEX IF NOT EXISTS idx_submissions_class_id       ON employa.submissions(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status         ON employa.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_val_status     ON employa.submissions(validation_status);
CREATE INDEX IF NOT EXISTS idx_submissions_submit_time    ON employa.submissions(submit_time);

CREATE INDEX IF NOT EXISTS idx_evidence_submission_id     ON employa.evidence_metadata(submission_id);
CREATE INDEX IF NOT EXISTS idx_evidence_file_hash         ON employa.evidence_metadata(file_hash);
CREATE INDEX IF NOT EXISTS idx_evidence_student_nis       ON employa.evidence_metadata(student_nis);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_status_scheduled   ON employa.ai_evaluation_jobs(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_locked_at          ON employa.ai_evaluation_jobs(locked_at);

CREATE INDEX IF NOT EXISTS idx_teacher_edit_submission    ON employa.teacher_edit_logs(submission_id);
CREATE INDEX IF NOT EXISTS idx_teacher_edit_teacher_id    ON employa.teacher_edit_logs(teacher_id);

CREATE INDEX IF NOT EXISTS idx_portfolios_student_id      ON employa.portfolios(student_id);
CREATE INDEX IF NOT EXISTS idx_readiness_student_id       ON employa.student_readiness_profiles(student_id);
