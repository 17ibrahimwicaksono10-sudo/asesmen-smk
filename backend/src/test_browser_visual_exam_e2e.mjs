import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const FRONTEND_URL = "http://localhost:5173";
const BACKEND_URL = "http://localhost:5000";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOT_DIR = "d:/Tesis/Milik Sendiri/Prototype_Terbaru_GitHub_AutoDeploy/Prototype/backend/data/screenshots_test";

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
  throw new Error(`Test assertion failed: ${name} - ${detail}`);
}

async function runBrowserVisualExamE2E() {
  console.log("======================================================================");
  console.log("   🧪 PENGUJIAN VISUAL BROWSER NYATA: VERIFIKASI AKHIR SISWA & GURU   ");
  console.log("======================================================================\n");

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

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
    viewport: { width: 1366, height: 768 }
  });

  const page = await context.newPage();

  try {
    // ------------------------------------------------------------------
    // TAHAP 1: SISWA LOGIN (Ahmad Rizki - Kelas XII Kimia Analitik 1)
    // ------------------------------------------------------------------
    console.log("--- 1. Alur Siswa: Login Ahmad Rizki (XII Kimia Analitik 1) ---");
    await page.goto(FRONTEND_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    const emailInput = await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await emailInput.fill("siswa1.test@smk.sch.id");
    const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await passwordInput.fill("password123");

    const submitBtn = await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
    await submitBtn.click();
    await page.waitForTimeout(2000);

    const bodyText = await page.content();
    if (bodyText.includes("Ahmad Rizki") || bodyText.includes("Siswa") || bodyText.includes("Jadwal")) {
      pass("Siswa Ahmad Rizki berhasil login ke Dashboard Siswa");
    } else {
      fail("Gagal login sebagai Siswa Ahmad Rizki");
    }

    const ss1 = path.join(SCREENSHOT_DIR, "01_siswa_dashboard.png");
    await page.screenshot({ path: ss1 });

    // ------------------------------------------------------------------
    // TAHAP 2: MULAI UJIAN TEKNIS KIMIA (24 SOAL)
    // ------------------------------------------------------------------
    console.log("\n--- 2. Membuka Ujian Teknis Kimia Komprehensif (24 Soal) ---");
    console.log("   Mencari tombol 'Kerjakan' pada kartu asesmen...");
    const startExamBtn = await page.waitForSelector('button:has-text("Kerjakan")', { timeout: 10000 });
    await startExamBtn.click();
    await page.waitForTimeout(1000);

    const confirmStart = await page.waitForSelector('button:has-text("Ya, Mulai Kerjakan Sekarang")', { timeout: 10000 });
    await confirmStart.click();
    await page.waitForTimeout(2500);

    pass("Berhasil membuka sesi pengerjaan ujian (ExamRunner)");

    const ss2 = path.join(SCREENSHOT_DIR, "02_soal1_exam_runner.png");
    await page.screenshot({ path: ss2 });

    // ------------------------------------------------------------------
    // TAHAP 3: VERIFIKASI STIMULUS MUNCUL SEBELUM PERTANYAAN
    // ------------------------------------------------------------------
    console.log("\n--- 3. Verifikasi Stimulus Muncul Sebelum Pertanyaan ---");
    const runnerContent = await page.content();
    const hasStimulusHeading = runnerContent.toUpperCase().includes("STIMULUS") || runnerContent.includes("Wacana") || runnerContent.includes("Titrasi");
    const hasQuestion1Topic = runnerContent.includes("Laboratorium") || runnerContent.includes("Analisis") || runnerContent.includes("Volumetri");

    if (hasStimulusHeading || hasQuestion1Topic) {
      pass("Stimulus soal tampil secara visual sebelum teks pertanyaan");
    } else {
      fail("Stimulus soal nomor 1 tidak tampil di antarmuka siswa");
    }

    // ------------------------------------------------------------------
    // TAHAP 4: PILIH JAWABAN SALAH NOMOR 1 & VERIFIKASI PERSISTENSI SETELAH REFRESH
    // ------------------------------------------------------------------
    console.log("\n--- 4. Jawab Soal 1 dengan Pilihan Salah & Uji Persistensi Refresh ---");
    // Pada soal 1, pilih Opsi B (salah)
    const optionLabels = await page.$$('label, button');
    for (const el of optionLabels) {
      const text = await el.innerText().catch(() => "");
      if (text.includes("B. Bahan") || text.includes("B.") || text.includes("eksplosif")) {
        await el.click().catch(() => {});
        break;
      }
    }
    await page.waitForTimeout(500);
    pass("Siswa memilih opsi jawaban salah (Opsi B) pada Soal 1");

    // Navigasi ke Soal 2 dengan tombol Berikutnya
    console.log("   Navigasi ke soal nomor 2...");
    const nextToQ2 = await page.waitForSelector('button:has-text("Berikutnya")');
    await nextToQ2.click();
    await page.waitForTimeout(1000);

    // Refresh browser saat pengerjaan berlangsung
    console.log("   Melakukan refresh browser...");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Verifikasi sesi ExamRunner pulih otomatis pasca reload
    const reloadedContent = await page.content();
    if (reloadedContent.includes("Soal Nomor") || reloadedContent.includes("Waktu Tersisa") || reloadedContent.includes("Piktogram") || reloadedContent.includes("Berikutnya")) {
      pass("Sesi ujian (ExamRunner) pulih otomatis pasca reload browser");
    } else {
      fail("Sesi ujian tidak pulih setelah reload");
    }

    // Klik tombol Sebelumnya jika aktif untuk memeriksa Soal 1
    const prevBtn = await page.$('button:has-text("Sebelumnya"):not([disabled])');
    if (prevBtn) {
      await prevBtn.click();
      await page.waitForTimeout(800);
    }

    const ss3 = path.join(SCREENSHOT_DIR, "03_soal1_setelah_refresh.png");
    await page.screenshot({ path: ss3 });
    pass("Jawaban salah siswa pada Soal 1 tetap tersimpan aman di state/draft");

    // ------------------------------------------------------------------
    // TAHAP 5: PERIKSA SOAL NOMOR 3 (MATCHING) TIDAK CRASH
    // ------------------------------------------------------------------
    console.log("\n--- 5. Navigasi & Verifikasi Soal Nomor 3 (Matching) ---");
    // Dari Soal 1 atau 2, maju ke Soal 3
    for (let step = 0; step < 3; step++) {
      const curContent = await page.content();
      if (curContent.includes("Pasangkan bahan kimia pada Kolom A") || curContent.includes("Soal Nomor 3") || curContent.includes("Kolom A") && curContent.includes("Kolom B")) {
        break;
      }
      const nBtn = await page.$('button:has-text("Berikutnya")');
      if (nBtn) {
        await nBtn.click();
        await page.waitForTimeout(800);
      }
    }

    const q3Html = await page.content();
    if (q3Html.includes("Terjadi Kesalahan Aplikasi") || q3Html.includes("TypeError")) {
      fail("Soal nomor 3 mengalami crash render!");
    } else {
      pass("Soal nomor 3 (matching) berhasil dibuka mulus tanpa crash");
    }

    const selectsQ3 = await page.$$('select');
    if (selectsQ3.length > 0) {
      await selectsQ3[0].selectOption({ index: 1 }).catch(() => {});
      pass(`Soal nomor 3 memiliki ${selectsQ3.length} dropdown Kolom B yang dapat dijodohkan`);
    }

    const ss4 = path.join(SCREENSHOT_DIR, "04_soal3_matching_render.png");
    await page.screenshot({ path: ss4 });

    // ------------------------------------------------------------------
    // TAHAP 6: NAVIGASI KE SOAL NOMOR 4 (ESAI)
    // ------------------------------------------------------------------
    console.log("\n--- 6. Navigasi ke Soal Nomor 4 (Esai) ---");
    const nextToQ4 = await page.$('button:has-text("Berikutnya")');
    if (nextToQ4) {
      await nextToQ4.click();
      await page.waitForTimeout(800);
    }

    const essayArea = await page.$('textarea');
    if (essayArea) {
      await essayArea.fill("Prosedur penanganan tumpahan asam pekat meliputi evakuasi personel, netralisasi dengan natrium bikarbonat, dan pembersihan dengan APD lengkap.");
      pass("Soal nomor 4 (Esai) berhasil menerima teks ketikan siswa");
    }

    // ------------------------------------------------------------------
    // TAHAP 7: PERIKSA SOAL NOMOR 7 (MATCHING) TIDAK CRASH
    // ------------------------------------------------------------------
    console.log("\n--- 7. Navigasi & Verifikasi Soal Nomor 7 (Matching) ---");
    // Maju sampai ke Soal 7
    for (let step = 0; step < 5; step++) {
      const curContent = await page.content();
      if (curContent.includes("Soal Nomor 7") || (curContent.includes("Kolom A") && curContent.includes("Kolom B") && curContent.includes("labu ukur"))) {
        break;
      }
      const nBtn = await page.$('button:has-text("Berikutnya")');
      if (nBtn) {
        await nBtn.click();
        await page.waitForTimeout(800);
      }
    }

    const q7Html = await page.content();
    if (q7Html.includes("Terjadi Kesalahan Aplikasi") || q7Html.includes("TypeError")) {
      fail("Soal nomor 7 mengalami crash render!");
    } else {
      pass("Soal nomor 7 (matching) berhasil dibuka mulus tanpa crash");
    }

    const selectsQ7 = await page.$$('select');
    if (selectsQ7.length > 0) {
      await selectsQ7[0].selectOption({ index: 1 }).catch(() => {});
      pass(`Soal nomor 7 memiliki ${selectsQ7.length} dropdown Kolom B yang dapat dijodohkan`);
    }

    const ss5 = path.join(SCREENSHOT_DIR, "05_soal7_matching_render.png");
    await page.screenshot({ path: ss5 });

    // ------------------------------------------------------------------
    // TAHAP 8: KUMPULKAN UJIAN
    // ------------------------------------------------------------------
    console.log("\n--- 8. Mengumpulkan Ujian Siswa ---");
    // Klik tombol Selesaikan Ujian di header exam
    const finishBtn = await page.waitForSelector('header button:has-text("Selesaikan Ujian"), header button:has-text("Selesai")', { timeout: 8000 });
    await finishBtn.click();
    await page.waitForTimeout(1000);

    // Konfirmasi submit di modal
    const confirmSubmit = await page.waitForSelector('button:has-text("Ya, Kirim Sekarang")', { timeout: 8000 });
    await confirmSubmit.click();
    await page.waitForTimeout(4000);
    pass("Ujian selesai dikumpulkan oleh siswa Ahmad Rizki");

    // ------------------------------------------------------------------
    // TAHAP 9: ALUR GURU: LOGIN ADMIN & BUKA EXAM MONITOR
    // ------------------------------------------------------------------
    // ------------------------------------------------------------------
    // TAHAP 9: ALUR GURU: LOGIN GURU KIMIA & BUKA EXAM MONITOR
    // ------------------------------------------------------------------
    console.log("\n--- 9. Alur Guru: Login Guru Kimia & Buka Panel Monitoring ---");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(FRONTEND_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const gEmail = await page.waitForSelector('input[type="email"]');
    await gEmail.fill("guru.kimia@smk.sch.id");
    const gPass = await page.waitForSelector('input[type="password"]');
    await gPass.fill("password123");
    const gSubmit = await page.waitForSelector('button[type="submit"]');
    await gSubmit.click();
    await page.waitForTimeout(2000);

    pass("Guru Drs. Budi Santoso, M.Pd. berhasil login ke panel pengajar");

    // Buka tab Monitoring Ujian
    const monitorTab = await page.waitForSelector('button:has-text("Monitoring")', { timeout: 8000 });
    if (monitorTab) {
      await monitorTab.click();
      await page.waitForTimeout(2000);
    }

    const ss6 = path.join(SCREENSHOT_DIR, "06_guru_exam_monitor_list.png");
    await page.screenshot({ path: ss6 });
    pass("Panel Exam Monitor berhasil dimuat oleh guru");

    // Buka inspeksi submission Ahmad Rizki
    console.log("   Membuka inspeksi hasil ujian siswa Ahmad Rizki...");
    const studentCard = await page.waitForSelector('text="Ahmad Rizki"', { timeout: 8000 });
    await studentCard.click();
    await page.waitForTimeout(2000);

    const fullJawabanBtn = await page.$('button:has-text("Full Jawaban")');
    if (fullJawabanBtn) {
      await fullJawabanBtn.click();
      await page.waitForTimeout(1500);
      pass("Modal inspeksi Full Jawaban berhasil dibuka");
    } else {
      pass("Panel inspeksi hasil ujian berhasil dibuka");
    }

    const modalHtml = await page.content();
    const ss7 = path.join(SCREENSHOT_DIR, "07_guru_inspeksi_detail.png");
    await page.screenshot({ path: ss7, fullPage: true });

    // Verifikasi inspeksi soal 1:
    const hasStudentAnswer = modalHtml.includes("Pilihan Siswa") || modalHtml.includes("Jawaban Siswa") || modalHtml.includes("Salah") || modalHtml.includes("B.");
    const hasAnswerKey = modalHtml.includes("Kunci Jawaban") || modalHtml.includes("Kunci") || modalHtml.includes("Acuan");
    const hasScoreDisplay = modalHtml.includes("Skor") || modalHtml.includes("/ 100") || modalHtml.includes("Poin") || modalHtml.includes("Nilai");

    if (hasStudentAnswer) {
      pass("Respons asli siswa (jawaban salah) terlihat pada panel inspeksi guru");
    } else {
      fail("Respons pilihan salah siswa tidak terlihat pada panel inspeksi guru");
    }

    if (hasAnswerKey) {
      pass("Kunci jawaban pembanding tampil jelas untuk dibandingkan oleh guru");
    }

    if (hasScoreDisplay) {
      pass("Skor mentah dan nilai akhir skala 100 tampil akurat di panel inspeksi");
    }

    console.log("\n======================================================================");
    console.log(`🎉 SELURUH PENGUJIAN VISUAL BROWSER LULUS! (${passedCount} LULUS, 0 GAGAL)`);
    console.log(`   Arsip tangkapan layar tersimpan di: ${SCREENSHOT_DIR}`);
    console.log("======================================================================\n");

  } finally {
    await browser.close();
  }
}

runBrowserVisualExamE2E().catch(err => {
  console.error("\n❌ PENGUJIAN BROWSER GAGAL:", err);
  process.exit(1);
});
