# Sistem Manajemen Asesmen Vokasi & Profil Kesiapan Kerja SMK

Aplikasi berbasis web untuk asesmen vokasi SMK (Kimia Industri & Employability Skills) yang dilengkapi analisis kesiapan kerja berbasis AI (Google Gemini).

Arsitektur aplikasi ini telah dipisahkan menjadi dua bagian utama:
1. **`backend/`** - REST API menggunakan Express.js, TypeScript, dan Google Gemini API.
2. **`frontend/`** - Single Page Application (SPA) menggunakan React 19, TypeScript, TailwindCSS, dan Vite.

---

## 📁 Struktur Direktori

```text
Prototype/
├── backend/
│   ├── src/
│   │   └── server.ts          # Express API server & Gemini AI handlers
│   ├── .env                   # Variabel lingkungan backend
│   ├── .env.example           # Template konfigurasi backend
│   ├── package.json           # Dependensi & script backend
│   └── tsconfig.json          # Konfigurasi TypeScript backend
├── frontend/
│   ├── src/                   # Komponen React, data, & state
│   ├── index.html             # HTML entry point Vite
│   ├── vite.config.ts         # Konfigurasi Vite & proxy API (/api -> backend)
│   ├── .env                   # Variabel lingkungan frontend
│   ├── .env.example           # Template konfigurasi frontend
│   ├── package.json           # Dependensi & script frontend
│   └── tsconfig.json          # Konfigurasi TypeScript frontend
├── package.json               # Root orchestrator (npm workspaces)
├── README.md                  # Dokumentasi proyek
└── .gitignore                 # Konfigurasi ignore file
```

---

## 🚀 Panduan Memulai Cepat

### 1. Instalasi Dependensi
Cukup jalankan satu perintah di root direktori untuk menginstal semua dependensi (root, backend, dan frontend):

```bash
npm install
```

### 2. Konfigurasi Lingkungan (.env)
Buka file `backend/.env` dan masukkan API Key Gemini Anda:

```env
PORT=5000
GEMINI_API_KEY=masukkan_api_key_gemini_anda_di_sini
CLIENT_ORIGIN=http://localhost:5173
```

> **Catatan:** Anda dapat memperoleh API Key secara gratis melalui [Google AI Studio](https://aistudio.google.com/).

### 3. Menjalankan Aplikasi

#### Opsi A: Jalankan Backend & Frontend Bersamaan (Rekomendasi)
```bash
npm run dev
```
Perintah ini akan menyalakan:
- **Backend API**: `http://localhost:5000`
- **Frontend App**: `http://localhost:5173`

Semua pemanggilan `/api/*` dari frontend secara otomatis diteruskan (*proxied*) ke backend di port 5000.

---

#### Opsi B: Menjalankan Secara Terpisah

**Hanya Backend:**
```bash
npm run dev:backend
# atau:
cd backend && npm run dev
```

**Hanya Frontend:**
```bash
npm run dev:frontend
# atau:
cd frontend && npm run dev
```

---

## 🛠️ Script yang Tersedia

Di root direktori:
- `npm run dev`: Menjalankan backend dan frontend secara bersamaan dengan `concurrently`.
- `npm run dev:backend`: Menjalankan backend dengan live-reloading (`tsx watch`).
- `npm run dev:frontend`: Menjalankan Vite dev server untuk frontend.
- `npm run build`: Mem-bundle backend dan frontend untuk kebutuhan produksi.
- `npm run build:backend`: Mem-bundle backend ke direktori `backend/dist`.
- `npm run build:frontend`: Mem-bundle frontend ke direktori `frontend/dist`.
- `npm run start`: Menjalankan server backend hasil build.

---

## 🔌 Dokumentasi Endpoint Backend

- `GET /api/health`
  Memeriksa status server backend dan memastikan konfigurasi API key.

- `POST /api/ai/evaluate-essay`
  Melakukan asesmen otomatis berbasis AI terhadap jawaban esai/studi kasus siswa dengan umpan balik konstruktif dan rekomendasi perbaikan.

- `POST /api/ai/analyze-readiness`
  Menghitung persentase kecocokan kerja (*job fit percentage*), analisis kesenjangan (*gap analysis*), dan aksi rekomendasi pembekalan siswa untuk posisi target di industri kimia.
