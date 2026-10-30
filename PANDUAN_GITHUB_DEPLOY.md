# Versi Proyek Terbaru: GitHub + Docker + VPS

Berasal dari `Prototype(1).rar`, disaring khusus agar **hanya kode** yang dikirim ke GitHub.

## Konten yang sengaja TIDAK disertakan

- `backend/.env`, `frontend/.env`, `.env`: API Key dan konfigurasi rahasia
- `backend/data/`: database siswa, cadangan, gambar, dan audio bukti asesmen
- `node_modules`, `dist`, test diagnostik, arsip lain

Jangan unggah arsip RAR aslinya atau menyalin `.env`/`backend/data` ke repository.

## Persiapan satu kali di VPS

1. Backup direktori `/home/ubuntu/Prototype/backend/data` dan `backend/.env`.
2. Pastikan `/home/ubuntu/Prototype/backend/.env` tetap berisi API Key sah di mesin VPS.
3. Pastikan folder `/home/ubuntu/Prototype/backend/data` menyimpan data yang memang ingin digunakan.
4. Jalankan di Termius: `sudo apt install -y rsync`.
5. Tes `sudo -n docker compose version` dari folder `/home/ubuntu/Prototype`.
6. Tetap gunakan SSH tunnel `localhost:8080` sampai masalah autentikasi dan otorisasi aplikasi diperbaiki.

## GitHub

1. Buat repo GitHub private kosong, contohnya `asesmen-smk`.
2. Salin isi folder `Prototype` dari ZIP ke folder proyek lokal yang akan di-push (isi folder, bukan file ZIP).
3. Buat SSH key untuk GitHub Actions, tambahkan kunci publik ke `~ubuntu/.ssh/authorized_keys` di VPS.
4. Di GitHub `Settings > Secrets and variables > Actions`, buat dua repository secrets:
   - `VPS_SSH_PRIVATE_KEY`: seluruh isi *private* key untuk deployment.
   - `VPS_SSH_KNOWN_HOSTS`: baris public SSH host key VPS `43.173.6.6 ssh-ed25519 AAAA...`, diverifikasi fingerprint-nya dengan Termius/VPS.
5. Push kode ke branch `main`, workflow otomatis menjalankan lint build, sinkronisasi kode, Docker build, dan health check.

## Catatan keamanan dan pemeliharaan

- Workflows saat ini memakai `rsync --delete` untuk menghapus file kode stale. Karena itu, pengecualian `backend/data/***` dan `.env` adalah KRITIS. Jangan hapus pengecualian ini.
- Kode sekarang mempunyai endpoint baca/tulis data yang belum terlindungi autentikasi memadai. Jangan membuka `127.0.0.1:8080` ke internet sebelum diperbaiki.
- CI/CD memerlukan *git push*; mengetik perubahan pada editor saja tidak memicu deployment.
- File database dan bukti audio/gambar dari RAR tetap perlu diunggah sendiri melalui Termius SFTP bila hendak memakai data lokal lama.
- Gunakan akun, branch protection, dan repository Actions permissions dengan prinsip hak akses minimum.
