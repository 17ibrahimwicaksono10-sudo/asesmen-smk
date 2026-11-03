-- =============================================================================
-- Migration 003: Submission Archive, Soft-Delete & Audit Logs
-- Branch: migration/supabase-staging
-- Description:
--   1. Menambahkan kolom is_archived, archived_at, archived_by, archive_reason
--      pada tabel employa.submissions untuk mendukung pengelolaan arsip dan soft-delete.
--   2. Membuat tabel employa.submission_audit_logs untuk ketertelusuran operasi
--      arsip, pemulihan (restore), dan cleanup permanen artefak pengujian.
--   3. Menambahkan indeks dan kebijakan RLS multi-tenant untuk proteksi audit log.
-- =============================================================================

-- 1. Penambahan Kolom Status Arsip pada Tabel Submissions
ALTER TABLE employa.submissions
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS archived_by TEXT NULL,
    ADD COLUMN IF NOT EXISTS archive_reason TEXT NULL;

-- Indeks performa untuk penyaringan daftar aktif vs arsip
CREATE INDEX IF NOT EXISTS idx_submissions_is_archived ON employa.submissions(is_archived);
CREATE INDEX IF NOT EXISTS idx_submissions_deleted_at ON employa.submissions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_submissions_school_class_archive ON employa.submissions(school_id, class_id, is_archived);

-- 2. Tabel Audit Log Pengelolaan Submission
CREATE TABLE IF NOT EXISTS employa.submission_audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    submission_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('archive', 'restore', 'cleanup_permanent')),
    performed_by TEXT NOT NULL,
    user_role TEXT NOT NULL CHECK (user_role IN ('admin', 'guru')),
    school_id TEXT NULL REFERENCES employa.schools(id) ON DELETE SET NULL,
    reason TEXT NULL,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sub_audit_logs_submission_id ON employa.submission_audit_logs(submission_id);
CREATE INDEX IF NOT EXISTS idx_sub_audit_logs_school_id ON employa.submission_audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_sub_audit_logs_action ON employa.submission_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_sub_audit_logs_created_at ON employa.submission_audit_logs(created_at DESC);

-- 3. Row Level Security (RLS) pada submission_audit_logs
ALTER TABLE employa.submission_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admin memiliki akses penuh (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS admin_all_submission_audit_logs ON employa.submission_audit_logs;
CREATE POLICY admin_all_submission_audit_logs ON employa.submission_audit_logs
    FOR ALL
    TO PUBLIC
    USING (employa.is_admin())
    WITH CHECK (employa.is_admin());

-- Policy: Guru dapat melihat audit log dari sekolahnya
DROP POLICY IF EXISTS teacher_select_submission_audit_logs ON employa.submission_audit_logs;
CREATE POLICY teacher_select_submission_audit_logs ON employa.submission_audit_logs
    FOR SELECT
    TO PUBLIC
    USING (
        employa.is_verified_teacher()
        AND school_id IS NOT NULL
        AND school_id = employa.get_verified_user_school_id()
    );

-- Policy: Guru dapat mencatat audit log untuk sekolahnya
DROP POLICY IF EXISTS teacher_insert_submission_audit_logs ON employa.submission_audit_logs;
CREATE POLICY teacher_insert_submission_audit_logs ON employa.submission_audit_logs
    FOR INSERT
    TO PUBLIC
    WITH CHECK (
        employa.is_verified_teacher()
        AND school_id IS NOT NULL
        AND school_id = employa.get_verified_user_school_id()
        AND user_role = 'guru'
        AND action IN ('archive', 'restore')
    );

-- Siswa DILARANG mengakses audit logs (tidak ada policy untuk siswa)
