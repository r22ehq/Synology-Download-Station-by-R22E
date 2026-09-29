import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MockNasServer } from '../tests/e2e/fixtures/mock-server.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extensionPath = path.join(root, '.output/chrome-mv3');
const mediaPath = path.join(root, 'docs/media');
const mockNas = new MockNasServer();
await mockNas.start();
mockNas.state.statistics = { speed_download: 12_400_000, speed_upload: 0 };
mockNas.state.tasks = [
  {
    id: 'active', title: 'Linux-distribution.iso', status: 'downloading', size: 4_800_000_000,
    type: 'http', username: 'demo',
    additional: {
      detail: { uri: 'https://example.org/linux.iso', destination: '/Downloads', create_time: 1, started_time: 2, completed_time: 0, priority: 'normal' },
      transfer: { size_downloaded: 3_264_000_000, size_uploaded: 0, speed_download: 12_400_000, speed_upload: 0 },
      file: [{ filename: 'Linux-distribution.iso', size: 4_800_000_000, size_downloaded: 3_264_000_000, priority: 'normal', wanted: true }],
    },
  },
  { id: 'finished', title: 'Sample-video.mp4', status: 'finished', size: 700_000_000, type: 'http', username: 'demo', additional: { transfer: { size_downloaded: 700_000_000, size_uploaded: 0, speed_download: 0, speed_upload: 0 } } },
  { id: 'paused', title: 'Example-archive.zip', status: 'paused', size: 320_000_000, type: 'http', username: 'demo', additional: { transfer: { size_downloaded: 120_000_000, size_uploaded: 0, speed_download: 0, speed_upload: 0 } } },
];

const context = await chromium.launchPersistentContext('', {
  headless: false,
  viewport: { width: 640, height: 400 },
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});

const shot = async (page, name) => {
  await page.mouse.move(638, 398);
  await page.evaluate(async () => {
    await document.fonts.ready;
    const host = document.querySelector('header [class*="subtitleRow"] > span');
    if (host) host.textContent = 'Demo NAS';
  });
  if (await page.locator('header button[aria-label="Refresh tasks"], header button[aria-label="Refreshing tasks"], header button[aria-label="Tasks refreshed"]').count()) {
    await page.locator('header button[aria-label="Refresh tasks"]').waitFor({ state: 'visible', timeout: 12_000 });
  }
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(mediaPath, name), type: 'jpeg', quality: 94,
    animations: 'disabled', caret: 'hide',
  });
};

try {
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.getByText('Add NAS').click();
  await page.getByLabel(/NAS URL/i).fill(mockNas.getUrl());
  await page.getByLabel(/Username/i).fill('demo');
  await page.getByPlaceholder('Password').fill('demo-only');
  await page.getByRole('button', { name: 'Save Profile' }).click();
  await page.getByText('Login Required').waitFor({ timeout: 30_000 }).catch(async error => {
    console.error('Login setup view:', (await page.locator('body').innerText()).slice(0, 1_000));
    throw error;
  });
  await page.getByPlaceholder('Password').fill('demo-only');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByText('Linux-distribution.iso').waitFor({ timeout: 10_000 });

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await page.getByText('Linux-distribution.iso').waitFor({ timeout: 10_000 });
  await page.getByRole('tab', { name: /Active,/ }).click();
  await page.getByRole('button', { name: 'Linux-distribution.iso', exact: true }).click();
  await page.getByText('Download speed').waitFor();
  await shot(page, 'store-task-details-1280x800.jpg');

  await page.getByRole('button', { name: 'Open add download form' }).click();
  await page.getByRole('dialog').waitFor();
  await shot(page, 'store-add-download-1280x800.jpg');
  await page.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  await page.getByRole('button', { name: 'Appearance' }).click();
  await page.getByRole('tab', { name: 'Dark', exact: true }).click();
  await shot(page, 'appearance-dark-1280x800.jpg');

  // Promotional artwork is a branded composition, distinct from real UI screenshots.
  const [icon, tasks] = await Promise.all([
    readFile(path.join(root, 'public/icon-128.png')),
    readFile(path.join(mediaPath, 'tasks-dark-1280x800.jpg')),
  ]);
  const iconUrl = `data:image/png;base64,${icon.toString('base64')}`;
  const tasksUrl = `data:image/jpeg;base64,${tasks.toString('base64')}`;
  const promo = async (width, height, name, inner) => {
    await page.setViewportSize({ width, height });
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;font-family:Inter,Arial,sans-serif}
      body{background:#111722;color:#f7f9ff;overflow:hidden}
      .canvas{width:100%;height:100%;position:relative;overflow:hidden;background:radial-gradient(circle at 77% 7%,#1e4060 0%,transparent 40%),linear-gradient(130deg,#101620,#1a2432 65%,#111925)}
      .canvas:before{content:'';position:absolute;inset:0;border:1px solid #34465a;pointer-events:none}
      .glow{position:absolute;border-radius:50%;filter:blur(54px);background:#3d91f855;pointer-events:none}
      .brand{display:flex;align-items:center;gap:16px}.brand img{border-radius:19%;box-shadow:0 12px 30px #0008}
      .eyebrow{color:#66b3ff;letter-spacing:.17em;text-transform:uppercase;font-weight:750}
      .screen{position:absolute;object-fit:cover;object-position:top left;border:1px solid #576b80;border-radius:15px;box-shadow:0 24px 45px #0009}
      .pill{display:inline-flex;align-items:center;gap:8px;border:1px solid #416875;background:#1d3b42;border-radius:999px;color:#b0f6cd}
      .dot{width:7px;height:7px;border-radius:50%;background:#49de81}
    </style></head><body><div class="canvas">${inner}</div></body></html>`);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); });
    await page.screenshot({ path: path.join(mediaPath, name), type: 'jpeg', quality: 95, animations: 'disabled', scale: 'css' });
  };
  await promo(440, 280, 'store-small-promo-440x280.jpg', `
    <div style="position:absolute;inset:0;background:linear-gradient(135deg,#0758ef,#0866fb 72%,#1675ff)"></div>
    <svg style="position:absolute;right:0;top:12px;opacity:.65" width="130" height="63" viewBox="0 0 130 63" aria-hidden="true"><path fill="#83b7ff" d="M0 57c17-2 24-9 34-9 12 0 14-12 26-12 13 0 17-15 30-15 14 0 15-15 31-15 4 0 7 1 9 2v55H0z"/></svg>
    <svg style="position:absolute;left:0;bottom:0;opacity:.48" width="94" height="48" viewBox="0 0 94 48" aria-hidden="true"><path fill="#a2caff" d="M0 7c18 0 18 17 34 17 12 0 16 9 29 9 11 0 15 7 31 7v8H0z"/></svg>
    <div style="position:absolute;left:23px;top:54px;width:203px;display:flex;flex-direction:column;align-items:center;text-align:center;z-index:2">
      <img src="${iconUrl}" width="91" height="91" style="border-radius:21px">
      <div style="color:#c8e6ff;font-size:23px;font-weight:850;letter-spacing:-.025em;line-height:1.05;margin-top:22px">R22E Station</div>
    </div>
    <div style="position:absolute;left:234px;top:68px;width:242px;height:235px;padding:12px 11px;background:#171d28;border:2px solid #b7d8ff;border-radius:14px;box-shadow:-14px 16px 32px #0035958a;transform:rotate(-6deg);color:#f7f9ff">
      <div style="display:flex;align-items:center;gap:7px;height:27px;border-bottom:1px solid #35404e;padding-bottom:9px">
        <img src="${iconUrl}" width="22" height="22" style="border-radius:5px"><strong style="font-size:13px;white-space:nowrap">R22E Station</strong><span style="color:#58df93;font-size:8px;margin-left:auto">●</span>
      </div>
      <div style="display:flex;gap:5px;margin-top:11px"><div style="height:27px;flex:1;border:1px solid #3a4655;border-radius:7px;color:#8290a5;font-size:9px;padding:7px 8px;white-space:nowrap">Paste URL or magnet...</div><div style="background:#357cf4;border-radius:7px;padding:6px 8px;font-size:11px;font-weight:700">+ Add</div></div>
      <div style="display:flex;gap:8px;margin-top:10px;align-items:center;font-size:9px;color:#9daabd"><span style="background:#244775;color:#80bcff;border-radius:5px;padding:5px 7px">All 3</span><span>Active 1</span><span>Completed 1</span></div>
      <div style="border:1px solid #3a4655;border-radius:8px;margin-top:10px;overflow:hidden">
        <div style="padding:8px 9px;border-bottom:1px solid #35404e"><div style="font-size:10px;font-weight:650">Linux-distribution.iso</div><div style="display:flex;align-items:center;gap:6px;margin-top:7px"><span style="display:block;width:106px;height:5px;border-radius:3px;background:linear-gradient(to right,#468bfa 68%,#394554 68%)"></span><span style="font-size:9px;color:#8ebdff">68%</span></div></div>
        <div style="padding:8px 9px"><div style="font-size:10px;font-weight:650">Sample-video.mp4</div><div style="font-size:9px;color:#56dc8c;margin-top:5px">Finished</div></div>
      </div>
    </div>`);
  await promo(1400, 560, 'store-marquee-promo-1400x560.jpg', `
    <div style="position:absolute;inset:0;background:linear-gradient(112deg,#f9fcff 0%,#ecf5ff 56%,#d7eaff 100%)"></div>
    <div style="position:absolute;left:82px;top:65px;max-width:645px;z-index:2">
      <div class="brand" style="gap:22px"><img src="${iconUrl}" width="76" height="76" style="border-radius:16px;box-shadow:none"><div style="color:#075fe3;font-size:40px;font-weight:850;letter-spacing:-.045em">R22E Station</div></div>
      <div style="font-size:58px;color:#15243a;font-weight:820;letter-spacing:-.052em;line-height:1.09;margin-top:57px">Synology downloads,<br>made simple.</div>
      <div style="font-size:22px;color:#46617f;margin-top:29px;line-height:1.4">Add links. Track progress. Pause or resume.</div>
    </div>
    <img class="screen" src="${tasksUrl}" style="width:780px;height:488px;left:745px;top:100px;transform:rotate(-4deg);border:2px solid #b3cce7;box-shadow:0 28px 60px #25466d4d">`);
  console.log('Created three real extension screenshots and two promotional tiles in docs/media.');
} finally {
  await context.close();
  await mockNas.stop();
}
