import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const logo = await readFile(new URL('../public/logo-ujeladea.png', import.meta.url));
const font = await readFile(new URL('../public/fonts/plus-jakarta-sans-latin.woff2', import.meta.url));
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="es"><head><meta charset="UTF-8"><style>
    @font-face{font-family:Jakarta;src:url(data:font/woff2;base64,${font.toString('base64')})}*{box-sizing:border-box}body{margin:0;background:#741b36;color:#fff;font-family:Jakarta,Arial,sans-serif;letter-spacing:0}
    main{width:1200px;height:630px;display:grid;grid-template-columns:1fr 380px;gap:48px;align-items:center;padding:58px 68px 110px;position:relative}
    h1{font-size:76px;line-height:1.12;margin:12px 0 24px;font-weight:800}p{font-size:25px;line-height:1.5;margin:0;color:#fae6ed}small{font-size:19px;color:#f1bccb}img{width:340px;height:340px;object-fit:contain}
    footer{position:absolute;bottom:0;left:0;right:0;height:82px;background:#111916;display:flex;align-items:center;justify-content:space-between;padding:0 68px;font-size:21px}footer span{color:#bbd5c7}
  </style></head><body><main><div><small>Distrito El Alto · Bolivia</small><h1>UJELADEA</h1><p>Juventud Los Amigos.<br>Una comunidad para crecer<br>en la fe y servir juntos.</p></div><img src="data:image/png;base64,${logo.toString('base64')}" alt="UJELADEA"><footer><strong>ujeladea.org</strong><span>Dependiente de UJELAB</span></footer></main></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluate(img => img.decode());
  const directory = new URL('../public/social/', import.meta.url);
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL('ujeladea-v1.png', directory)) });
  console.log('Generated 1200 x 630 branded social preview.');
} finally { await browser.close(); }
