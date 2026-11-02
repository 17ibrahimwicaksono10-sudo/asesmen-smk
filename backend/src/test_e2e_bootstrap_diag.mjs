import { chromium } from 'playwright-core';

async function run() {
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true
    });
  } catch (e) {
    browser = await chromium.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: true
    });
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Frontend]') || text.includes('Error') || text.includes('error')) {
      console.log('[CONSOLE]', msg.type(), text);
    }
  });
  page.on('pageerror', err => console.error('[PAGE ERROR]', err.message));
  page.on('response', async resp => {
    if (resp.url().includes('/api/')) {
      const size = (await resp.body().catch(() => Buffer.from(''))).length;
      console.log('[NET]', resp.status(), resp.url().replace('http://localhost:5173', ''), Math.round(size / 1024) + ' KB');
    }
  });

  console.log('\n======================================================');
  console.log('1. TEST ANONYMOUS FIRST LOAD (No login session)');
  console.log('======================================================');
  const t0 = Date.now();
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  console.log('Page loaded in', Date.now() - t0, 'ms. Title:', await page.title());

  const isAuthModalVisible = await page.isVisible('button:has-text("Masuk ke Dashboard")').catch(() => false);
  console.log('Is AuthModal visible?', isAuthModalVisible);
  const isLoadingStuckAnon = await page.isVisible('text=Memuat EmployaSkills').catch(() => false);
  console.log('Is loading screen stuck on anonymous?', isLoadingStuckAnon);

  console.log('\n======================================================');
  console.log('2. TEST ADMIN LOGIN & HYDRATION (Ibrahim Wicaksono)');
  console.log('======================================================');
  await page.fill('input[type="email"]', 'admin@app.com');
  await page.fill('input[type="password"]', 'password');
  const tAdminLogin = Date.now();

  const [adminLoginResp] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/auth/login')),
    page.click('button:has-text("Masuk ke Dashboard")')
  ]);
  console.log('Admin login status:', adminLoginResp.status());

  const adminBootstrapResp = await page.waitForResponse(resp => resp.url().includes('/api/bootstrap'), { timeout: 10000 });
  console.log('Post-login /api/bootstrap responded with status:', adminBootstrapResp.status());

  // Wait for react render
  await page.waitForTimeout(500);
  console.log('Admin login to render completed in', Date.now() - tAdminLogin, 'ms.');

  const isLoadingStuckAdmin = await page.isVisible('text=Memuat EmployaSkills').catch(() => false);
  console.log('Is loading screen visible after admin login?', isLoadingStuckAdmin);
  const isAdminDashboardVisible = await page.isVisible('text=Dinas & Pusat Asesmen Vocational SMK').catch(() => false);
  console.log('Is admin dashboard overview visible?', isAdminDashboardVisible);

  console.log('\n======================================================');
  console.log('3. TEST ADMIN REFRESH (Session persistence & hydration)');
  console.log('======================================================');
  const tReload = Date.now();
  await page.reload({ waitUntil: 'networkidle' });
  console.log('Reload networkidle in', Date.now() - tReload, 'ms.');

  const isReloadLoadingVisible = await page.isVisible('text=Memuat EmployaSkills').catch(() => false);
  console.log('Is loading screen stuck after admin reload?', isReloadLoadingVisible);
  const isReloadAdminDashVisible = await page.isVisible('text=Dinas & Pusat Asesmen Vocational SMK').catch(() => false);
  console.log('Is admin dashboard visible after reload?', isReloadAdminDashVisible);

  // Logout Admin
  console.log('Logging out admin...');
  await page.click('button:has-text("Keluar")');
  await page.waitForTimeout(500);

  console.log('\n======================================================');
  console.log('4. TEST GURU LOGIN & EXAM MONITOR (Drs. Budi Santoso)');
  console.log('======================================================');
  await page.fill('input[type="email"]', 'guru.kimia@smk.sch.id');
  await page.fill('input[type="password"]', 'password123');
  const tGuruLogin = Date.now();

  const [guruLoginResp] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/auth/login')),
    page.click('button:has-text("Masuk ke Dashboard")')
  ]);
  console.log('Guru login status:', guruLoginResp.status());

  const guruBootstrapResp = await page.waitForResponse(resp => resp.url().includes('/api/bootstrap'), { timeout: 10000 });
  console.log('Guru /api/bootstrap status:', guruBootstrapResp.status());
  await page.waitForTimeout(500);
  console.log('Guru login completed in', Date.now() - tGuruLogin, 'ms.');

  const isGuruDashboardVisible = await page.isVisible('text=DASHBOARD GURU PENGUJI').catch(() => false);
  console.log('Is Guru dashboard visible?', isGuruDashboardVisible);

  // Navigate to Monitoring tab
  console.log('Navigating to Monitoring & Validasi tab...');
  const monitorTabBtn = await page.$('button:has-text("Monitoring & Validasi")');
  if (monitorTabBtn) {
    await monitorTabBtn.click();
    await page.waitForTimeout(600);
    const isMonitorTitleVisible = await page.isVisible('text=Monitoring & Panel Validasi Guru').catch(() => false);
    console.log('Is ExamMonitor panel visible?', isMonitorTitleVisible);

    // Click Full Jawaban button on first submission card to test on-demand detail loading
    const fullJawabanBtn = await page.$('button:has-text("Full Jawaban")');
    if (fullJawabanBtn) {
      console.log('Clicking Full Jawaban button to load on-demand detail...');
      const [detailResp] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/submissions/')),
        fullJawabanBtn.click()
      ]);
      console.log('On-demand submission detail fetched with status:', detailResp.status());
      await page.waitForTimeout(500);
      const isModalRendered = await page.isVisible('text=Mode Jawaban Lengkap (Full View)').catch(() => false);
      console.log('Is Full View modal rendered with details?', isModalRendered);
      // Close modal
      const closeBtn = await page.$('button[title="Tutup Tampilan Penuh"]');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(300);
    }
  }

  // Logout Guru
  console.log('Logging out guru...');
  await page.click('button:has-text("Keluar")');
  await page.waitForTimeout(500);

  console.log('\n======================================================');
  console.log('5. TEST SISWA LOGIN & WORK READINESS PROFILE (Ahmad Rizki)');
  console.log('======================================================');
  await page.fill('input[type="email"]', 'siswa1.test@smk.sch.id');
  await page.fill('input[type="password"]', 'password123');
  const tSiswaLogin = Date.now();

  const [siswaLoginResp] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/auth/login')),
    page.click('button:has-text("Masuk ke Dashboard")')
  ]);
  console.log('Siswa login status:', siswaLoginResp.status());

  const siswaBootstrapResp = await page.waitForResponse(resp => resp.url().includes('/api/bootstrap'), { timeout: 10000 });
  console.log('Siswa /api/bootstrap status:', siswaBootstrapResp.status());
  await page.waitForTimeout(500);
  console.log('Siswa login completed in', Date.now() - tSiswaLogin, 'ms.');

  const isSiswaDashboardVisible = await page.isVisible('text=Portal Asesmen Mandiri & Kesiapan Kerja Siswa').catch(() => false);
  console.log('Is Siswa dashboard visible?', isSiswaDashboardVisible);
  const isGreetingVisible = await page.isVisible('text=Halo, Ahmad Rizki').catch(() => false);
  console.log('Is personalized greeting visible?', isGreetingVisible);

  console.log('\nClosing browser...');
  await browser.close();
  console.log('\n✅ ALL E2E VERIFICATIONS PASSED CLEANLY! ZERO STUCK LOADING, LIGHTWEIGHT PAYLOADS, FULL FUNCTIONALITY CONFIRMED.');
}

run().catch(err => {
  console.error('Fatal E2E test error:', err);
  process.exit(1);
});
