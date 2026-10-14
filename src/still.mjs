// Renders images and carousels with headless Chrome.

import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import puppeteer from 'puppeteer-core';
import { sizeFor } from './formats.mjs';
import { lang } from './i18n.mjs';
import { brandDir } from './paths.mjs';

export function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  const found = candidates.find((p) => p && existsSync(p));
  if (!found) throw new Error('Chrome not found. Install it or set CHROME_PATH.');
  return found;
}

export const launch = () =>
  puppeteer.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] });

// A slide's image paths are looked up in the project first, then in the brand's assets.
function assetUrl(ws, project, brand, p) {
  if (!p || /^(https?:|data:)/.test(p)) return p;
  const inProject = join(project.dir, p);
  if (existsSync(inProject)) return `/ws/${relative(ws, inProject)}`;
  return `/ws/${relative(ws, join(brandDir(ws, brand.id), 'assets', p))}`;
}

export async function renderStills({ browser, base, ws, project, plan, brand, piece, outDir }) {
  const slides = piece.type === 'carousel' ? piece.slides : [piece.slide];
  const size = sizeFor(plan.platform, piece);
  const bDir = brandDir(ws, brand.id);
  const fontsCss = brand.fonts?.css ? `${base}/ws/${relative(ws, join(bDir, brand.fonts.css))}` : null;
  const l = lang(plan.language);
  const files = [];
  const warnings = [];

  for (const [index, raw] of slides.entries()) {
    const slide = { ...raw, photo: assetUrl(ws, project, brand, raw.photo) };
    const brandForPage = { ...brand, logo: brand.logo ? assetUrl(ws, project, brand, brand.logo.replace(/^assets\//, '')) : null };
    const page = await browser.newPage();
    await page.setViewport({ width: size[0], height: size[1], deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument((d) => { window.__STILL__ = d; }, {
      brand: brandForPage, slide, index, total: slides.length, size, fontsCss, lang: l.code, ui: l.ui, assetBase: `/ws/${relative(ws, join(bDir, 'assets'))}`,
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => r.status() >= 400 && !r.url().endsWith('favicon.ico') && errors.push(`${r.status()} ${r.url()}`));

    await page.goto(`${base}/kit/templates/still/index.html`, { waitUntil: 'networkidle0' });
    await page.waitForFunction('window.__STILL_READY__ || window.__STILL_ERROR__', { timeout: 20000 });
    const err = await page.evaluate('window.__STILL_ERROR__');
    if (err || errors.length) throw new Error(`${piece.id} slide ${index + 1}: ${err || errors.join('; ')}`);

    const overflow = await page.evaluate(() => {
      const f = document.getElementById('frame');
      return f.scrollHeight > f.clientHeight + 1 || f.scrollWidth > f.clientWidth + 1;
    });
    if (overflow) warnings.push(`${piece.id} slide ${index + 1}: content doesn't fit the frame; shorten the text.`);

    const file = slides.length > 1 ? `slide-${index + 1}.png` : `${piece.id}.png`;
    await page.screenshot({ path: join(outDir, file), type: 'png' });
    await page.close();
    files.push(file);
  }
  return { files, warnings };
}
