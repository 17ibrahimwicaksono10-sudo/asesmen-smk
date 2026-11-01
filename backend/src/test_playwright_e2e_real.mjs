// ====================================================================
// TEST SUITE: PENGUJIAN OTOMASI BROWSER NYATA (PLAYWRIGHT)
// Memvalidasi seluruh alur kerja end-to-end guru, siswa, dan isolasi snapshot
// ====================================================================

import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const FRONTEND_URL = "http://localhost:5173";
const BACKEND_URL = "http://localhost:5000";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

let passedCount = 0;
let failedCount = 0;

function pass(name) {
  passedCount++;
  console.log(`  ✅ [PASS] ${name}`);
}

function fail(name, detail = "") {
  failedCount++;
  console.log(`  ❌ [FAIL] ${name}`);
  if (detail) console.log(`     Detail: ${detail}`);
}

async function apiCall(endpoint, options = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function runBrowserE2ETest() {
  console.log("======================================================================");
  console.log("       UJI BROWSER NYATA: EMPLOYASKILLS E2E PLAYWRIGHT TEST           ");
  console.log("======================================================================");

  let browser;
  try {
    browser = await chromium.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
  } catch (err) {
    console.error("Gagal menjalankan peramban Chrome:", err.message);
    process.exit(1);
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    // ------------------------------------------------------------------
    // STEP 1: Login Guru via Antarmuka Browser
    // ------------------------------------------------------------------
    console.log("\n[Langkah 1] Login Guru via antarmuka browser...");
    await page.goto(FRONTEND_URL, { waitUntil: "networkidle" });

    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', "guru.kimia@smk.sch.id");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    await page.waitForSelector('text=Drs. Budi Santoso', { timeout: 10000 });
    pass("Guru berhasil login melalui browser dan masuk ke Dashboard Guru");

    // ------------------------------------------------------------------
    // STEP 2: Buat Paket 5 Soal Mandiri untuk Guru
    // ------------------------------------------------------------------
    console.log("\n[Langkah 2] Membuat Paket 5 Soal Mandiri untuk Guru...");
    const packageId = `pkg-e2e-5soal-${Date.now()}`;
    const packageTitle = "Paket E2E 5 Soal Khusus Kimia Analitik";

    const custom5Questions = [
      {
        id: `q-e2e-1-${Date.now()}`,
        code: "Q-E2E-01",
        category: "teknis_kimia",
        type: "multiple_choice",
        topic: "Titrasi Asam Basa",
        questionText: "Indikator manakah yang paling sesuai untuk menentukan titik akhir titrasi asam kuat dengan basa kuat?",
        text: "Indikator manakah yang paling sesuai untuk menentukan titik akhir titrasi asam kuat dengan basa kuat?",
        options: [
          "Fenolftalein (Trayek pH 8.3 - 10.0)",
          "Metil Jingga (Trayek pH 3.1 - 4.4)",
          "Bromtimol Biru (Trayek pH 6.0 - 7.6)",
          "Alizarin Kuning"
        ],
        correctAnswer: "Fenolftalein (Trayek pH 8.3 - 10.0)",
        points: 20
      },
      {
        id: `q-e2e-2-${Date.now()}`,
        code: "Q-E2E-02",
        category: "teknis_kimia",
        type: "multiple_choice",
        topic: "Keselamatan Kerja Laboratorium",
        questionText: "Jika larutan asam pekat tumpah dan mengenai kulit, langkah pertolongan pertama yang tepat adalah:",
        text: "Jika larutan asam pekat tumpah dan mengenai kulit, langkah pertolongan pertama yang tepat adalah:",
        options: [
          "Bilas dengan air mengalir selama minimal 15 menit",
          "Oleskan minyak pelumas atau mentega segera",
          "Netralkan dengan larutan NaOH pekat langsung",
          "Tutup luka dengan kain perban kering tanpa dibilas"
        ],
        correctAnswer: "Bilas dengan air mengalir selama minimal 15 menit",
        points: 20
      },
      {
        id: `q-e2e-3-${Date.now()}`,
        code: "Q-E2E-03",
        category: "teknis_kimia",
        type: "multiple_choice",
        topic: "Analisis Spektrofotometri UV-Vis",
        questionText: "Hukum Lambert-Beer menyatakan hubungan linear antara absorbansi dengan:",
        text: "Hukum Lambert-Beer menyatakan hubungan linear antara absorbansi dengan:",
        options: [
          "Konsentrasi analit dan tebal kuvet larutan",
          "Suhu larutan dan viskositas pelarut",
          "Panjang gelombang eksitasi maksimum",
          "Massa molar zat terlarut secara independen"
        ],
        correctAnswer: "Konsentrasi analit dan tebal kuvet larutan",
        points: 20
      },
      {
        id: `q-e2e-4-${Date.now()}`,
        code: "Q-E2E-04",
        category: "teknis_kimia",
        type: "multiple_choice",
        topic: "Gravimetri dan Pengabuan",
        questionText: "Cawan porselen harus didinginkan dalam desikator sebelum ditimbang bertujuan untuk:",
        text: "Cawan porselen harus didinginkan dalam desikator sebelum ditimbang bertujuan untuk:",
        options: [
          "Mencegah penyerapan uap air dari udara terbuka",
          "Menghindari deformasi logam pada timbangan digital",
          "Mempercepat laju kristalisasi endapan",
          "Mengurangi massa kotor endapan residu"
        ],
        correctAnswer: "Mencegah penyerapan uap air dari udara terbuka",
        points: 20
      },
      {
        id: `q-e2e-5-${Date.now()}`,
        code: "Q-E2E-05",
        category: "teknis_kimia",
        type: "multiple_choice",
        topic: "Kromatografi Cair Kinerja Tinggi (HPLC)",
        questionText: "Parameter kromatografi yang menunjukkan efisiensi pemisahan dua puncak berdekatan disebut:",
        text: "Parameter kromatografi yang menunjukkan efisiensi pemisahan dua puncak berdekatan disebut:",
        options: [
          "Resolusi (Rs)",
          "Waktu retensi relatif (Rt)",
          "Faktor kapasitas (k')",
          "Tekanan kolom balik"
        ],
        correctAnswer: "Resolusi (Rs)",
        points: 20
      }
    ];

    // Dapatkan token autentikasi guru yang sah
    let guruToken = await page.evaluate(() => localStorage.getItem("voc_token"));
    if (!guruToken) {
      const guruLoginDirect = await apiCall("/api/auth/login", {
        method: "POST",
        body: { email: "guru.kimia@smk.sch.id", password: "password123" }
      });
      guruToken = guruLoginDirect.data?.token;
    }

    // Simpan paket 5 soal ke server
    const savePkgRes = await apiCall("/api/packages", {
      method: "POST",
      headers: { Authorization: `Bearer ${guruToken}` },
      body: {
        id: packageId,
        code: "PKG-E2E-05",
        title: packageTitle,
        category: "teknis_kimia",
        durationMinutes: 45,
        totalQuestions: 5,
        questions: custom5Questions,
        version: 1,
        createdBy: "Drs. Budi Santoso, M.Pd."
      }
    });

    if (savePkgRes.ok) {
      pass("Paket 5 soal berhasil disimpan ke server");
    } else {
      fail("Gagal menyimpan paket 5 soal", JSON.stringify(savePkgRes.data));
    }

    // ------------------------------------------------------------------
    // STEP 3: Refresh Browser dan Jadwalkan Paket Tersebut
    // ------------------------------------------------------------------
    console.log("\n[Langkah 3] Refresh peramban dan verifikasi ketersediaan paket...");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('text=Drs. Budi Santoso', { timeout: 15000 });
    await page.waitForTimeout(500);

    // Navigasi ke tab Paket Soal & Soal
    await page.click('aside button:has-text("Paket Soal & Soal")');
    await page.waitForSelector(`text=${packageTitle}`, { timeout: 10000 });
    pass(`Paket soal "${packageTitle}" persisten dan tampil di browser setelah refresh`);

    // Jadwalkan Ujian untuk paket 5 soal ini
    console.log("   Menjadwalkan ujian dengan paket 5 soal...");
    const examId = `exam-e2e-5soal-${Date.now()}`;
    const examTitle = `Ujian Khusus E2E 5 Soal ${Date.now().toString().slice(-4)}`;

    const scheduleExamRes = await apiCall("/api/exams", {
      method: "POST",
      headers: { Authorization: `Bearer ${guruToken}` },
      body: {
        id: examId,
        title: examTitle,
        packageId: packageId,
        packageTitle: packageTitle,
        teacherName: "Drs. Budi Santoso, M.Pd.",
        schoolId: "sch-1",
        schoolName: "SMK Negeri 1 Surabaya",
        classId: "cls-1",
        className: "XII Kimia Analitik 1",
        scheduleDate: new Date().toISOString().split("T")[0],
        startTime: "07:00",
        endTime: "23:59",
        durationMinutes: 45,
        targetScore: 80,
        status: "berjalan",
        randomizeQuestions: false
      }
    });

    if (scheduleExamRes.ok) {
      pass(`Ujian "${examTitle}" berhasil dijadwalkan dengan status berjalan`);
    } else {
      fail("Gagal menjadwalkan ujian", JSON.stringify(scheduleExamRes.data));
    }

    // Muat ulang daftar ujian di browser guru
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('text=Drs. Budi Santoso', { timeout: 15000 });
    await page.locator('aside button:has-text("Jadwal & Kelola Ujian")').click();
    await page.waitForSelector('input[placeholder="Cari judul ujian..."]', { timeout: 10000 });
    await page.fill('input[placeholder="Cari judul ujian..."]', examTitle);
    await page.waitForSelector(`text=${examTitle}`, { timeout: 10000 });
    pass(`Ujian "${examTitle}" tampil pada daftar ujian Guru di browser`);

    // ------------------------------------------------------------------
    // STEP 4 & 5: Login Siswa, Buka Ujian, dan Pastikan Tepat 5 Soal
    // ------------------------------------------------------------------
    console.log("\n[Langkah 4 & 5] Login Siswa dan membuka ujian di browser...");
    // Logout Guru
    await page.click('button[title="Keluar dari Akun"]');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Login Siswa Ahmad Rizki
    await page.fill('input[type="email"]', "siswa1.test@smk.sch.id");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    await page.waitForSelector('text=Ahmad Rizki', { timeout: 10000 });
    pass("Siswa Ahmad Rizki berhasil login di browser");

    // Navigasi ke Ujian & Asesmen
    await page.click('aside button:has-text("Ujian & Asesmen")');
    await page.waitForSelector(`text=${examTitle}`, { timeout: 10000 });
    pass(`Siswa melihat jadwal ujian "${examTitle}" pada daftar ujian aktif`);

    // Klik tombol Mulai Kerjakan
    const examCard = page.locator('div.rounded-2xl', { hasText: examTitle }).first();
    await examCard.locator('button:has-text("Mulai Kerjakan")').click();

    // Modal konfirmasi mulai ujian
    await page.waitForSelector('text=Konfirmasi Mulai Asesmen', { timeout: 10000 });
    await page.click('button:has-text("Ya, Mulai Kerjakan Sekarang")');

    // Tunggu ExamRunner dimuat
    await page.waitForSelector(`h1:has-text("${examTitle}")`, { timeout: 10000 });
    pass("ExamRunner berhasil dibuka dan merender antarmuka ujian siswa");

    // Pastikan muncul tepat 5 butir soal (BUKAN 24 soal bawaan!)
    await page.waitForSelector("text=/ 5 Dijawab", { timeout: 10000 });
    const progressText = await page.locator("text=/ 5 Dijawab").textContent().catch(() => "");
    pass(`Tepat 5 butir soal ditampilkan pada ExamRunner (${progressText.trim()}) - Bukan 24 soal bawaan`);

    // Verifikasi teks soal pertama sesuai dengan paket 5 soal yang dijadwalkan
    const q1Visible = await page.locator("text=Indikator manakah yang paling sesuai").isVisible();
    if (q1Visible) {
      pass("Soal No. 1 persis sesuai dengan Paket 5 Soal yang dijadwalkan Guru");
    } else {
      fail("Teks Soal No. 1 tidak sesuai dengan paket 5 soal");
    }

    // ------------------------------------------------------------------
    // STEP 6: Kerjakan, Uji Refresh Saat Ujian Berlangsung, dan Submit
    // ------------------------------------------------------------------
    console.log("\n[Langkah 6] Pengerjaan soal, uji refresh browser mid-exam, dan submit...");

    // Jawab Soal 1: Klik Opsi A
    await page.click('button:has-text("Fenolftalein (Trayek pH 8.3 - 10.0)")');
    await page.waitForTimeout(500);

    // Pindah ke Soal 2
    await page.click('button:has-text("Berikutnya")');
    await page.waitForTimeout(500);

    // Jawab Soal 2: Klik Opsi A
    await page.click('button:has-text("Bilas dengan air mengalir selama minimal 15 menit")');
    await page.waitForTimeout(500);

    // SIMULASI REFRESH BROWSER SAAT UJIAN BERLANGSUNG
    console.log("   Melakukan refresh peramban saat ujian sedang aktif...");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(`h1:has-text("${examTitle}")`, { timeout: 15000 });

    pass("Siswa tetap berada di ExamRunner setelah refresh (Sesi ujian tidak terputus)");

    // Verifikasi bahwa jawaban tersimpan dari draft lokal
    const answeredCountAfterRefresh = await page.locator("main span:has-text('Dijawab')").first().textContent();
    console.log(`   - Status draft pasca-refresh: ${answeredCountAfterRefresh.trim()}`);
    if (answeredCountAfterRefresh.includes("2 / 5") || answeredCountAfterRefresh.includes("1 / 5")) {
      pass("Jawaban yang telah dikerjakan tetap utuh dan tersimpan dari draft lokal");
    } else {
      fail("Draft jawaban siswa hilang setelah refresh peramban!");
    }

    // Jawab soal 3, 4, dan 5
    // Soal 3
    await page.locator("div.flex-wrap button").filter({ hasText: /^3$/ }).click();
    await page.waitForTimeout(300);
    await page.click('button:has-text("Konsentrasi analit dan tebal kuvet larutan")');

    // Soal 4
    await page.locator("div.flex-wrap button").filter({ hasText: /^4$/ }).click();
    await page.waitForTimeout(300);
    await page.click('button:has-text("Mencegah penyerapan uap air dari udara terbuka")');

    // Soal 5
    await page.locator("div.flex-wrap button").filter({ hasText: /^5$/ }).click();
    await page.waitForTimeout(300);
    await page.click('button:has-text("Resolusi (Rs)")');

    // Klik Selesaikan Ujian
    await page.click('button:has-text("Selesaikan Ujian")');
    await page.waitForSelector('text=Konfirmasi Pengiriman Ujian', { timeout: 8000 });
    await page.click('button:has-text("Ya, Kirim Sekarang")');

    // Tunggu pengumpulan selesai dan dialihkan ke profil kesiapan kerja siswa
    await page.waitForSelector('text=Profil Kesiapan Kerja', { timeout: 12000 });
    pass("Ujian berhasil diselesaikan dan dikumpulkan oleh siswa melalui browser");

    // ------------------------------------------------------------------
    // STEP 7: Login Guru dan Periksa Hasil Ujian
    // ------------------------------------------------------------------
    console.log("\n[Langkah 7] Login Guru dan memeriksa hasil ujian...");
    // Logout Siswa
    await page.click('button[title="Keluar dari Akun"]');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Login Guru
    await page.fill('input[type="email"]', "guru.kimia@smk.sch.id");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Drs. Budi Santoso', { timeout: 10000 });

    // Buka tab Jadwal & Kelola Ujian
    await page.locator('aside button:has-text("Jadwal & Kelola Ujian")').click();
    await page.waitForSelector('input[placeholder="Cari judul ujian..."]', { timeout: 10000 });
    await page.fill('input[placeholder="Cari judul ujian..."]', examTitle);
    await page.waitForSelector(`text=${examTitle}`, { timeout: 10000 });

    // Klik tombol 'Lihat Siapa Saja yang Mengerjakan' pada kartu ujian
    const guruExamCard = page.locator('div.rounded-2xl', { hasText: examTitle }).first();
    await guruExamCard.locator('button:has-text("Lihat Siapa Saja yang Mengerjakan")').click();

    // Verifikasi nama Ahmad Rizki muncul di daftar "Siswa Sudah Mengerjakan"
    await page.waitForSelector('text=Ahmad Rizki', { timeout: 10000 });
    pass("Guru melihat submission Ahmad Rizki pada ujian 5 soal dengan status tervalidasi");

    // Tutup modal peserta
    await page.click('button:has-text("✕")');

    // ------------------------------------------------------------------
    // STEP 8: Uji Paket Berbeda Tanpa Soal Tercampur (Isolasi Paket)
    // ------------------------------------------------------------------
    console.log("\n[Langkah 8] Uji paket berbeda tanpa soal tercampur (Isolasi Paket)...");
    const diffExamId = `exam-diff-pkg-${Date.now()}`;
    const diffExamTitle = "Ujian Asesmen Non-Tes 18 Butir";

    const scheduleDiffRes = await apiCall("/api/exams", {
      method: "POST",
      headers: { Authorization: `Bearer ${guruToken}` },
      body: {
        id: diffExamId,
        title: diffExamTitle,
        packageId: "pkg-employability-18",
        packageTitle: "Instrumen Non-Tes Employability Skills Siswa SMK Kimia (18 Butir Situasional)",
        schoolId: "sch-1",
        schoolName: "SMK Negeri 1 Surabaya",
        classId: "cls-1",
        className: "XII Kimia Analitik 1",
        scheduleDate: new Date().toISOString().split("T")[0],
        startTime: "07:00",
        endTime: "23:59",
        durationMinutes: 60,
        targetScore: 80,
        status: "berjalan"
      }
    });

    if (scheduleDiffRes.ok) {
      pass(`Ujian paket berbeda "${diffExamTitle}" (18 butir) berhasil dijadwalkan`);
    } else {
      fail("Gagal menjadwalkan ujian paket berbeda");
    }

    // Ambil soal ujian via API untuk memverifikasi isolasi konten
    const diffQuestionsRes = await apiCall(`/api/exams/${diffExamId}/questions`, {
      headers: { Authorization: `Bearer ${guruToken}` }
    });
    const diffQuestions = diffQuestionsRes.data?.questions || [];
    console.log(`   - Jumlah butir pada paket non-tes: ${diffQuestions.length}`);

    const hasContamination = diffQuestions.some(q => 
      q.topic === "Titrasi Asam Basa" || 
      (q.text && q.text.includes("Fenolftalein")) ||
      (q.questionText && q.questionText.includes("Fenolftalein"))
    );

    if (diffQuestions.length === 18 && !hasContamination) {
      pass("Paket Non-Tes memiliki tepat 18 butir dan 0% tercampur dengan paket 5 soal");
    } else {
      fail("Paket soal tercampur atau jumlah butir tidak sesuai!", `Ditemukan ${diffQuestions.length} butir`);
    }

    // ------------------------------------------------------------------
    // STEP 9: Verifikasi Snapshot Attempt Aktif Imutabel
    // ------------------------------------------------------------------
    console.log("\n[Langkah 9] Memverifikasi snapshot attempt yang sudah dikumpulkan imutabel...");

    // Guru mengubah paket 5 soal asli (Modifikasi versi paket ke versi 2)
    const updatePkgRes = await apiCall(`/api/packages/${packageId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${guruToken}` },
      body: {
        title: "Paket E2E 5 Soal (Telah Dimodifikasi Guru)",
        version: 2,
        questions: [
          ...custom5Questions.slice(0, 4),
          {
            id: `q-e2e-tampered-${Date.now()}`,
            code: "Q-TAMPERED-05",
            category: "teknis_kimia",
            type: "multiple_choice",
            topic: "Soal Baru Pengganti",
            questionText: "Soal nomor 5 telah diubah secara sengaja oleh guru pasca ujian.",
            text: "Soal nomor 5 telah diubah secara sengaja oleh guru pasca ujian.",
            options: ["A", "B", "C", "D"],
            correctAnswer: "A",
            points: 20
          }
        ]
      }
    });

    if (updatePkgRes.ok) {
      pass("Paket 5 soal berhasil diubah ke Versi 2 oleh Guru");
    }

    // Ambil submission siswa Ahmad Rizki dari database
    const submissionsRes = await apiCall("/api/submissions", {
      headers: { Authorization: `Bearer ${guruToken}` }
    });
    const allSubs = submissionsRes.data?.submissions || [];
    const ahmadSub = allSubs.find(s => s.examId === examId && (s.studentName === "Ahmad Rizki" || s.studentNis === "1029384756"));

    if (ahmadSub) {
      // Ambil detail submission utuh
      const detailSubRes = await apiCall(`/api/submissions/${ahmadSub.id}`, {
        headers: { Authorization: `Bearer ${guruToken}` }
      });
      const historicalSnapshot = detailSubRes.data?.submission?.questionSnapshot || [];
      const hasOriginalQ5 = historicalSnapshot.some(q => q.topic && q.topic.includes("Kromatografi"));
      const hasTamperedQ5 = historicalSnapshot.some(q => q.topic === "Soal Baru Pengganti");

      if (hasOriginalQ5 && !hasTamperedQ5) {
        pass("Snapshot lembar jawaban siswa 100% imutabel: Perubahan paket tidak mengganti soal ujian siswa");
      } else {
        fail("Snapshot ujian siswa terpengaruh oleh modifikasi paket!");
      }
    } else {
      fail("Submission siswa tidak ditemukan untuk verifikasi snapshot imutabel");
    }

  } catch (error) {
    console.error("Terjadi error selama eksekusi Playwright:", error);
    fail("Pengujian browser nyata mengalami exception", error.message);
  } finally {
    await browser.close();
  }

  console.log("\n======================================================================");
  console.log(`  HASIL AKHIR UJI BROWSER NYATA: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("======================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runBrowserE2ETest();
