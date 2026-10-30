# 🐘 Panduan Setup PostgreSQL

Database aplikasi Sistem Asesmen & Profil Kesiapan Kerja SMK menggunakan **PostgreSQL**.

---

## 📁 Struktur File Database

```
backend/
├── migrations/
│   ├── 001_schema.sql   ← DDL: buat semua tabel & index
│   └── 002_seed.sql     ← DML: isi data awal dari database.json
├── src/
│   ├── pgClient.ts      ← Layer koneksi (Pool, query helpers)
│   └── migrate.ts       ← Script untuk jalankan migrasi
└── .env                 ← Konfigurasi koneksi DB
```

---

## 🗄️ Skema Tabel

| Tabel | Deskripsi |
|---|---|
| `schools` | Data sekolah |
| `users` | Admin, Guru, Siswa |
| `classes` | Kelas / rombel |
| `teacher_assigned_classes` | Relasi guru ↔ kelas (many-to-many) |
| `packages` | Paket soal (employability dan teknis kimia) |
| `questions` | Soal-soal dengan kolom JSONB untuk tipe kompleks |
| `exams` | Jadwal ujian |
| `submissions` | Hasil pengerjaan ujian siswa (jawaban sebagai JSONB) |
| `archives` | Data diarsipkan |
| `settings` | Pengaturan sistem (key-value) |

---

## Setup Langkah demi Langkah

### 1. Install PostgreSQL

- Windows: Download dari https://www.postgresql.org/download/windows/
- Ingat username (postgres) dan password yang dibuat saat instalasi

### 2. Buat Database

Buka pgAdmin atau psql lalu jalankan:

```sql
CREATE DATABASE asesmen_smk;
```

Atau via terminal:
```powershell
psql -U postgres -c "CREATE DATABASE asesmen_smk;"
```

### 3. Konfigurasi .env

Edit file backend/.env:

```
# Opsi A: Koneksi lokal (paling umum)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=asesmen_smk
DB_USER=postgres
DB_PASSWORD=password_anda_disini
DB_SSL=false

# Opsi B: Connection string (untuk Supabase/Neon/Railway)
# DATABASE_URL=postgresql://user:pass@host:5432/asesmen_smk
```

### 4. Install Dependency

```powershell
cd backend
npm install
```

### 5. Jalankan Migrasi

```powershell
npm run migrate
```

Output yang diharapkan:
```
[MIGRATE] Memulai migrasi PostgreSQL...
[MIGRATE] Berhasil: 001_schema.sql
[MIGRATE] Berhasil: 002_seed.sql
[MIGRATE] Semua migrasi selesai!
```

### 6. Jalankan Backend

```powershell
npm run dev
```

---

## Database Cloud Gratis (Alternatif)

Jika tidak ingin install PostgreSQL lokal, gunakan layanan gratis:

| Provider | URL | Batas Gratis |
|---|---|---|
| Supabase | supabase.com | 500 MB |
| Neon | neon.tech | 512 MB |
| Railway | railway.app | 1 GB |

Setelah daftar, copy connection string ke DATABASE_URL di .env.

---

## Reset Data

Untuk reset database ke kondisi awal, jalankan di psql/pgAdmin:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

Lalu jalankan ulang:
```powershell
npm run migrate
```

---

## Catatan Soal JSONB

Soal-soal dengan tipe kompleks (complex_mcq, matching, essay_subquestions) menggunakan kolom JSONB:

- options — array opsi jawaban
- scoring_map — peta skor per opsi misalnya {"A":1,"B":5}
- statements — pernyataan untuk tipe complex_mcq
- matching_col_a / matching_col_b — pasangan matching
- sub_questions — sub-pertanyaan esai
- rubric_components — komponen rubrik penilaian

---

## Mengintegrasikan Backend dengan PostgreSQL

File src/pgClient.ts menyediakan helper:

```typescript
import { queryAll, queryOne, query } from './pgClient.js';

// Ambil semua user
const users = await queryAll('SELECT * FROM users ORDER BY created_at');

// Ambil satu user
const user = await queryOne('SELECT * FROM users WHERE email = $1', [email]);

// Insert user baru
await query(
  'INSERT INTO users (id, name, email, role) VALUES ($1,$2,$3,$4)',
  [id, name, email, role]
);
```
