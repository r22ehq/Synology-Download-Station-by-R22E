import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const smallPromoMarkup = iconUrl => `
  <div style="position:absolute;inset:0;background:linear-gradient(135deg,#0758ef,#0866fb 72%,#1675ff)"></div>
  <svg style="position:absolute;right:14px;top:7px;opacity:.62" width="124" height="52" viewBox="0 0 124 52" aria-hidden="true"><defs><linearGradient id="promoCloudTop" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d8ecff"/><stop offset="1" stop-color="#83b8ff"/></linearGradient></defs><path fill="url(#promoCloudTop)" d="M10 42c-5 0-8-3-8-7 0-5 4-8 9-8 2 0 4 0 6 1 2-7 8-12 16-12 2 0 4 0 6 1 4-8 12-13 21-13 8 0 15 4 19 10 3-2 7-3 11-3 10 0 18 7 19 16 6 1 10 5 10 11 0 6-5 10-11 10H12c-1 0-2-3-2-6z"/><path fill="#edf7ff" opacity=".25" d="M18 27c3-7 8-10 15-10 3 0 5 1 7 2 5-8 12-12 20-12 7 0 13 3 17 8-7-3-14-4-20-2-8 2-11 8-18 10-8 2-13-1-21 4z"/></svg>
  <svg style="position:absolute;left:22px;bottom:12px;opacity:.52" width="120" height="42" viewBox="0 0 120 42" aria-hidden="true"><defs><linearGradient id="promoCloudBottom" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d1e8ff"/><stop offset="1" stop-color="#8cbfff"/></linearGradient></defs><path fill="url(#promoCloudBottom)" d="M12 35C5 35 2 31 2 26c0-5 4-9 10-9 2 0 4 0 6 1C21 10 28 5 37 5c7 0 13 3 17 9 3-2 6-3 10-3 8 0 14 5 16 11 3-2 7-3 11-3 7 0 13 4 15 10 7 0 11 3 11 7 0 4-4 6-9 6H13c-2 0-3-3-1-7z"/><path fill="#edf7ff" opacity=".2" d="M20 18c3-7 9-11 17-11 6 0 11 3 15 8-6-2-10-2-15 0-6 2-11 1-17 3z"/></svg>
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
  </div>`;

export async function renderSmallPromo(outputPath = path.join(root, 'docs/media/store-small-promo-440x280-v4.png')) {
  const icon = await readFile(path.join(root, 'public/icon-128.png'));
  const iconUrl = `data:image/png;base64,${icon.toString('base64')}`;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 440, height: 280 }, deviceScaleFactor: 3 });
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;font-family:Inter,Arial,sans-serif}
      body{color:#f7f9ff;overflow:hidden}
      .canvas{width:100%;height:100%;position:relative;overflow:hidden}
      .canvas:before{content:'';position:absolute;inset:0;border:1px solid #34465a;pointer-events:none}
    </style></head><body><div class="canvas">${smallPromoMarkup(iconUrl)}</div></body></html>`);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); });
    await page.screenshot({ path: outputPath, type: 'png', animations: 'disabled', scale: 'css' });
    return outputPath;
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(await renderSmallPromo());
}
