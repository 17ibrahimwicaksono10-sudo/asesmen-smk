-- =============================================================================
-- SISTEM ASESMEN & PROFIL KESIAPAN KERJA SMK
-- PostgreSQL Schema Migration: 001_schema.sql
-- =============================================================================

-- Enable UUID extension (opsional, kita pakai TEXT id agar kompatibel dgn JSON lama)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. SCHOOLS (Sekolah)
-- =============================================================================
CREATE TABLE IF NOT EXISTS schools (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    code            TEXT UNIQUE NOT NULL,
    address         TEXT,
    total_classes   INTEGER DEFAULT 0,
    total_teachers  INTEGER DEFAULT 0,
    total_students  INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. USERS (Admin, Guru, Siswa)
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('admin','guru','siswa')),
    identity_no     TEXT,
    school_id       TEXT REFERENCES schools(id) ON DELETE SET NULL,
    school_name     TEXT,
    class_id        TEXT,   -- FK ke classes; ditambahkan FK setelah tabel classes dibuat
    class_name      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. CLASSES (Kelas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS classes (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    school_id       TEXT REFERENCES schools(id) ON DELETE CASCADE,
    school_name     TEXT,
    teacher_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
    teacher_name    TEXT,
    academic_year   TEXT,
    student_count   INTEGER DEFAULT 0,
    exam_count      INTEGER DEFAULT 0,
    class_code      TEXT UNIQUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Tambah FK class_id di users setelah tabel classes ada
ALTER TABLE users
    ADD CONSTRAINT fk_users_class
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
    NOT VALID;   -- NOT VALID agar bisa diisi data legacy tanpa class

-- =============================================================================
-- 4. TEACHERS (detail tambahan guru: multi-kelas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS teacher_assigned_classes (
    teacher_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id    TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, class_id)
);

-- =============================================================================
-- 5. QUESTION PACKAGES (Paket Soal)
-- =============================================================================
CREATE TABLE IF NOT EXISTS packages (
    id                  TEXT PRIMARY KEY,
    code                TEXT UNIQUE NOT NULL,
    title               TEXT NOT NULL,
    description         TEXT,
    category            TEXT NOT NULL,   -- 'employability' | 'teknis_kimia'
    duration_minutes    INTEGER DEFAULT 60,
    total_questions     INTEGER DEFAULT 0,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at_date     DATE,
    created_by          TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 6. QUESTIONS (Soal dalam Paket)
-- =============================================================================
CREATE TABLE IF NOT EXISTS questions (
    id              TEXT PRIMARY KEY,
    package_id      TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    code            TEXT,
    number          INTEGER,
    category        TEXT,
    type            TEXT NOT NULL,   -- 'multiple_choice' | 'essay' | 'matching' | 'complex_mcq' | 'short_answer' | 'essay_subquestions' | 'scenario_assessment'

    -- Bidang teknis (hanya untuk pkg teknis_kimia)
    dimension_id    TEXT,
    dimension_name  TEXT,
    indicator       TEXT,
    context         TEXT,
    cognitive_level TEXT,
    stimulus        TEXT,
    max_score       INTEGER,
    points          INTEGER,

    -- Bidang employability
    aspect_id       TEXT,
    aspect_name     TEXT,
    topic           TEXT,

    question_text   TEXT NOT NULL,
    correct_answer  TEXT,
    rubric_guide    TEXT,
    sample_answer   TEXT,

    -- Kolom JSON untuk data kompleks (options, scoringMap, statements, dll.)
    options         JSONB,   -- array of string
    scoring_map     JSONB,   -- { "A": 1, "B": 2, ... }
    statements      JSONB,   -- untuk complex_mcq
    matching_col_a  JSONB,   -- untuk matching
    matching_col_b  JSONB,   -- untuk matching
    rubric_components JSONB, -- array of rubric component
    sub_questions   JSONB,   -- untuk essay_subquestions / scenario_assessment

    -- short_answer fields
    short_answer_key    TEXT,
    short_answer_key2   TEXT,
    unit                TEXT,
    calculation_prompt  TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 7. EXAMS (Jadwal Ujian)
-- =============================================================================
CREATE TABLE IF NOT EXISTS exams (
    id                  TEXT PRIMARY KEY,
    title               TEXT NOT NULL,
    package_id          TEXT REFERENCES packages(id) ON DELETE SET NULL,
    package_title       TEXT,
    category            TEXT,
    class_id            TEXT REFERENCES classes(id) ON DELETE SET NULL,
    class_name          TEXT,
    school_id           TEXT REFERENCES schools(id) ON DELETE SET NULL,
    school_name         TEXT,
    teacher_id          TEXT REFERENCES users(id) ON DELETE SET NULL,
    teacher_name        TEXT,
    schedule_date       DATE,
    start_time          TIME,
    end_time            TIME,
    duration_minutes    INTEGER,
    target_score        INTEGER,
    status              TEXT DEFAULT 'terjadwal',  -- 'terjadwal' | 'berjalan' | 'selesai'
    total_students      INTEGER DEFAULT 0,
    completed_students  INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 8. SUBMISSIONS (Hasil Pengerjaan Ujian Siswa)
-- =============================================================================
CREATE TABLE IF NOT EXISTS submissions (
    id                  TEXT PRIMARY KEY,
    exam_id             TEXT REFERENCES exams(id) ON DELETE CASCADE,
    exam_title          TEXT,
    student_id          TEXT REFERENCES users(id) ON DELETE SET NULL,
    student_name        TEXT,
    student_nis         TEXT,
    class_name          TEXT,
    submit_time         TIMESTAMPTZ,
    total_score         NUMERIC(6,2),
    technical_score     NUMERIC(6,2),
    employability_score NUMERIC(6,2),
    status              TEXT DEFAULT 'menunggu',  -- 'menunggu' | 'dinilai'
    teacher_follow_up   TEXT,
    ai_evaluation       TEXT,
    answers             JSONB,   -- objek jawaban per question_id
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 9. ARCHIVES (Data Diarsipkan)
-- =============================================================================
CREATE TABLE IF NOT EXISTS archives (
    id              TEXT PRIMARY KEY,
    type            TEXT,    -- 'paket_soal' | 'ujian'
    title           TEXT,
    archived_at     DATE,
    reason          TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 10. SETTINGS (Pengaturan Sistem)
-- =============================================================================
CREATE TABLE IF NOT EXISTS settings (
    key     TEXT PRIMARY KEY,
    value   TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES untuk performa query umum
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role        ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_school_id   ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_questions_pkg_id  ON questions(package_id);
CREATE INDEX IF NOT EXISTS idx_exams_class_id    ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_package_id  ON exams(package_id);
CREATE INDEX IF NOT EXISTS idx_submissions_exam  ON submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
