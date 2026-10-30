# 🚀 Panduan Deployment Pilot Testing ke VPS
**Sistem Asesmen Vokasi & Profil Kesiapan Kerja SMK**

Dokumen ini memandu langkah demi langkah instalasi dan peluncuran aplikasi pada server VPS (Ubuntu/Debian) untuk kebutuhan *Pilot Testing*.

---

## 📋 Ringkasan Arsitektur Produksi
Aplikasi telah dioptimalkan untuk mode produksi:
- **Backend & Frontend berjalan dalam 1 service** (Port 5000). Backend Express otomatis melayani frontend SPA (*dist*) dan API (`/api/*`).
- **Database saat ini**: JSON Persistence di `backend/data/database.json` (sangat ringan, siap pakai untuk skala pilot testing tanpa konfigurasi database server yang rumit).
- **Process Manager**: PM2 via [`ecosystem.config.cjs`](file:///d:/Tesis/Milik%20Sendiri/After%20Sempro/Prof%20Sus%20Luaran/Prototype%20Prof%20Sus/Prototype/ecosystem.config.cjs) (otomatis restart jika crash atau server reboot).

---

## 1. Persiapan VPS (Spesifikasi Rekomendasi)
- **OS**: Ubuntu 22.04 LTS / 24.04 LTS
- **RAM**: Minimal 1 GB (Rekomendasi: 2 GB)
- **CPU**: 1 Core / 2 Cores
- **Port Terbuka**: 22 (SSH), 80 (HTTP), 443 (HTTPS)

---

## 2. Instalasi Dependensi di VPS

Login ke VPS via SSH, lalu jalankan perintah berikut:

```bash
# 1. Update package list
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20 LTS & Git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# 3. Verifikasi versi
node -v   # v20.x.x
npm -v    # 10.x.x

# 4. Install PM2 (Process Manager) secara global
sudo npm install -g pm2
```

---

## 3. Upload / Clone Kode ke VPS

### Opsi A: Menggunakan Git (Direkomendasikan)
```bash
cd /var/www
git clone <URL_REPO_ANDA> asesmen-smk
cd asesmen-smk/Prototype
```

### Opsi B: Upload ZIP via SCP / FileZilla
Jika mengupload file zip proyek:
```bash
mkdir -p /var/www/asesmen-smk
# Ekstrak file zip ke dalam /var/www/asesmen-smk/Prototype
cd /var/www/asesmen-smk/Prototype
```

---

## 4. Konfigurasi Lingkungan (`.env`)

Salin atau buat file `.env` di folder `backend/`:

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Pastikan variabel berikut terisi dengan benar:
```env
PORT=5000
CLIENT_ORIGIN=http://domain-anda.com
GEMINI_API_KEY=AIzaSy...masukkan_api_key_gemini_yang_valid_disini
```

> ⚠️ **PENTING**: Dapatkan API Key Gemini aktif secara gratis melalui [Google AI Studio](https://aistudio.google.com/). Fitur evaluasi esai otomatis dan analisis kesiapan kerja AI membutuhkan API key yang valid.

---

## 5. Install Dependency & Build Production

Di root folder `Prototype`:

```bash
# 1. Install semua dependensi (root, backend, frontend)
npm install

# 2. Build bundle frontend dan backend
npm run build
```

Hasil build akan terbentuk di:
- `backend/dist/server.js`
- `frontend/dist/`

---

## 6. Jalankan dengan PM2

Jalankan aplikasi di background menggunakan file konfigurasi PM2:

```bash
# Start aplikasi
pm2 start ecosystem.config.cjs

# Simpan state PM2 agar otomatis jalan saat VPS restart
pm2 save
pm2 startup
# (Jalankan perintah sudo env PATH... yang muncul di terminal)
```

Untuk memantau log aplikasi:
```bash
pm2 logs asesmen-smk
pm2 status
```

---

## 7. Setup Nginx & Domain/SSL (HTTPS)

Untuk pilot testing dengan siswa dan guru di berbagai perangkat, **HTTPS sangat disarankan** karena fitur pengunggahan kamera/audio membutuhkan koneksi aman di peramban seluler.

Buat file konfigurasi Nginx:
```bash
sudo nano /etc/nginx/sites-available/asesmen-smk
```

Isi dengan konfigurasi berikut (ganti `domainanda.com` dengan domain/subdomain Anda, atau gunakan IP VPS):
```nginx
server {
    listen 80;
    server_name domainanda.com; # atau IP VPS jika belum ada domain

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan konfigurasi dan restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/asesmen-smk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Pasang SSL Gratis (Let's Encrypt - Opsional jika pakai domain):
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domainanda.com
```

---

## 8. Data Uji Coba & Akun Bawaan (Default Login)

Saat aplikasi pertama kali berjalan, sistem sudah dilengkapi data awal:

| Peran (Role) | Email | Password | Kegunaan |
|---|---|---|---|
| **Admin Utama** | `admin@sekolah.sch.id` | `123456` | Kelola master sekolah, guru, kelas, pengaturan AI |
| **Guru (Pengampu)** | `hendra.wijaya@sekolah.sch.id` | `123456` | Kelola bank soal, jadwal ujian, koreksi esai AI, validasi bukti |
| **Siswa (Uji Coba)** | `bintang.pratama@siswa.sch.id` | `123456` | Mengerjakan ujian, asesmen multimodal, profil kesiapan kerja |
| **Siswa (Uji Coba 2)**| `siti.aminah@siswa.sch.id` | `123456` | Pengerjaan ujian & portofolio |

*Catatan: Siswa dan Guru baru juga dapat langsung mendaftar sendiri melalui halaman registrasi di beranda.*

---

## 9. Backup Data Selama Pilot Testing
Seluruh data ujian, jawaban siswa, dan profil tersimpan di file:
`backend/data/database.json`

Anda dapat mengunduh atau mem-backup file ini secara berkala menggunakan `scp` atau `rsync`:
```bash
# Contoh download backup ke komputer lokal
scp user@ip_vps:/var/www/asesmen-smk/Prototype/backend/data/database.json ./backup-database.json
```
