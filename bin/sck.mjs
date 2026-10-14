#!/usr/bin/env node
// sck — social content kit. See README.md or "sck help".

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { downloadFonts, init as brandInit } from '../src/brand.mjs';
import { FORMATS } from '../src/formats.mjs';
import { lang, supported } from '../src/i18n.mjs';
import { brandDir, has, loadBrand, projectDir, slug, workspace } from '../src/paths.mjs';
import { serve } from '../src/server.mjs';
import { chromePath, launch, renderStills } from '../src/still.mjs';
import { create as videoNew, check as videoCheck, render as videoRender, snapshot as videoSnapshot, syncBrand } from '../src/video.mjs';
import { VENV, applyTiming, setupVoice, synthesize, voiceFor } from '../src/voice.mjs';

const HELP = `sck — images, carousels and videos for social media in an app's own visual style.

Workspace: --workspace <dir> | $SCK_WORKSPACE | ./social-content

  sck doctor                               what's installed and what's missing
  sck setup voice                          install Kokoro (local voice-over) in ${VENV}
  sck languages                            content languages with a default voice

  sck brands                               brands in the workspace
  sck brand init <repo-url|owner/repo|folder> [--id x] [--force]
                                           scan the app and write a brand draft
  sck brand fonts <id>                     re-download the brand's Google Fonts

  sck project new <name> --brand <id> --platform <p> --language <code> [--ui-language <code>] [--goal <g>]
                                           create projects/<date>-<name>/plan.json
  sck video new <project> <piece> [--force]   create the HyperFrames project for a video piece
  sck video sync <project> <piece>         re-copy the brand (and <html lang>) into the video
  sck voice <project> <piece>              generate the voice-over (Kokoro), apply timing and captions
  sck timing <project> <piece>             recompute timing and captions without re-generating the voice
  sck check <project> <piece>              validate the composition (lint, runtime, contrast)
  sck snapshot <project> <piece> [--at 1,4.5]  key frames as PNG (default: each scene)
  sck render <project> [--only <piece>] [--draft] [--docker|--local]
                                           render everything and build out/index.html for review

Platforms and formats: ${Object.entries(FORMATS).map(([p, f]) => `${p} (${Object.keys(f).join(', ')})`).join('; ')}`;

// ---------- args ----------

const argv = process.argv.slice(2);
const positional = [];
const opts = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) { opts[key] = next; i++; } else opts[key] = true;
  } else positional.push(a);
}
const [cmd, sub, ...rest] = positional;

const ws = () => workspace(opts);
const today = () => new Date().toISOString().slice(0, 10);

function project(name) {
  if (!name) throw new Error('Missing the project.');
  const direct = resolve(name);
  const dir = existsSync(join(direct, 'plan.json')) ? direct : projectDir(ws(), name);
  const planFile = join(dir, 'plan.json');
  if (!existsSync(planFile)) throw new Error(`${planFile} not found`);
  const plan = JSON.parse(readFileSync(planFile, 'utf8'));
  validate(plan);
  return { dir, id: basename(dir), plan, brand: loadBrand(ws(), plan.brand) };
}

function piece(p, id) {
  const found = p.plan.pieces.find((x) => x.id === id);
  if (!found) throw new Error(`The plan has no piece "${id}". Pieces: ${p.plan.pieces.map((x) => x.id).join(', ')}`);
  return found;
}

function validate(plan) {
  const errs = [];
  if (!plan.brand) errs.push('missing "brand"');
  if (!plan.platform) errs.push('missing "platform"');
  if (!plan.language) errs.push(`missing "language" (voice-over, captions and on-screen text). Supported: ${supported()}`);
  if (!Array.isArray(plan.pieces) || !plan.pieces.length) errs.push('"pieces" is empty');
  for (const pc of plan.pieces || []) {
    if (!pc.id || !/^[a-z0-9-]+$/.test(pc.id)) errs.push(`piece with an invalid id: ${pc.id}`);
    if (!['image', 'carousel', 'video'].includes(pc.type)) errs.push(`${pc.id}: type must be image | carousel | video`);
    if (pc.type === 'image' && !pc.slide) errs.push(`${pc.id}: missing "slide"`);
    if (pc.type === 'carousel' && !pc.slides?.length) errs.push(`${pc.id}: missing "slides"`);
    if (pc.type === 'video' && !pc.scenes?.length) errs.push(`${pc.id}: missing "scenes"`);
    for (const sc of pc.scenes || []) if (!sc.id || !/^[a-z0-9-]+$/.test(sc.id)) errs.push(`${pc.id}: scene with an invalid id: ${sc.id}`);
  }
  if (errs.length) throw new Error(`invalid plan.json:\n  - ${errs.join('\n  - ')}`);
}

// ---------- commands ----------

function doctor() {
  const py = existsSync(join(VENV, 'bin', 'python')) || existsSync(join(VENV, 'Scripts', 'python.exe'));
  let chrome = null;
  try { chrome = chromePath(); } catch {}
  const rows = [
    ['Node', process.versions.node, Number(process.versions.node.split('.')[0]) >= 22, 'Node 22 or newer'],
    ['Chrome', chrome || 'no', !!chrome, 'install Google Chrome or set CHROME_PATH'],
    ['FFmpeg', has('ffmpeg') ? 'yes' : 'no', has('ffmpeg'), 'for local video and voice: sudo apt install ffmpeg | brew install ffmpeg'],
    ['Docker', has('docker') ? 'yes' : 'no', true, 'optional: deterministic renders with --docker'],
    ['Voice (Kokoro)', py ? VENV : 'no', py, 'optional: sck setup voice'],
    ['git', has('git') ? 'yes' : 'no', has('git'), 'to use repo links'],
  ];
  for (const [name, val, ok, hint] of rows) console.log(`${ok ? '✓' : '✗'} ${name.padEnd(15)} ${val}${ok ? '' : `  → ${hint}`}`);
  console.log(`\nWorkspace: ${ws()}`);
}

function languages() {
  console.log('Content languages with a default voice (any other language works with an explicit Kokoro voice):\n');
  for (const code of ['en', 'en-GB', 'es', 'fr', 'it', 'pt-BR', 'hi', 'ja', 'zh']) {
    const l = lang(code);
    console.log(`  ${code.padEnd(7)} ${l.name.padEnd(16)} female: ${l.voices.female.padEnd(11)} male: ${l.voices.male}`);
  }
  console.log('\nAll 54 voices: npx hyperframes tts --list · https://github.com/thewh1teagle/kokoro-onnx');
}

function brands() {
  const dir = join(ws(), 'brands');
  const list = existsSync(dir) ? readdirSync(dir).filter((d) => existsSync(join(dir, d, 'brand.json'))) : [];
  if (!list.length) return console.log('No brands yet. Create one with: sck brand init <repo|folder>');
  for (const id of list) {
    const b = JSON.parse(readFileSync(join(dir, id, 'brand.json'), 'utf8'));
    console.log(`${id.padEnd(20)} ${b.name}${b.status === 'draft' ? '  (draft)' : ''}  ← ${b.source?.ref || ''}`);
  }
}

function projectNew(name) {
  if (!name || !opts.brand || !opts.platform || !opts.language) {
    throw new Error('Usage: sck project new <name> --brand <id> --platform <platform> --language <code> [--ui-language <code>] [--goal <goal>]');
  }
  loadBrand(ws(), opts.brand);
  const dir = projectDir(ws(), `${today()}-${slug(name)}`);
  if (existsSync(join(dir, 'plan.json'))) throw new Error(`${dir} already exists`);
  mkdirSync(dir, { recursive: true });
  const plan = {
    brand: opts.brand,
    platform: opts.platform,
    language: opts.language,
    ...(opts['ui-language'] ? { ui_language: opts['ui-language'] } : {}),
    goal: opts.goal || '',
    title: name,
    status: 'draft',
    pieces: [],
  };
  writeFileSync(join(dir, 'plan.json'), JSON.stringify(plan, null, 2) + '\n');
  console.log(dir);
}

function defaultSnapshotTimes(dir) {
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  return [...html.matchAll(/<[^>]*data-scene="[^"]+"[^>]*>/g)].map((m) => {
    const s = Number(m[0].match(/data-start="([\d.]+)"/)?.[1] || 0);
    const d = Number(m[0].match(/data-duration="([\d.]+)"/)?.[1] || 0);
    return +(s + d * 0.75).toFixed(2);
  });
}

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function reviewPage(p, results) {
  const cards = results.map(({ pc, files, caption, errors }) => {
    const media = files.map((f) => (f.endsWith('.mp4')
      ? `<video src="${pc.id}/${f}" controls playsinline></video>`
      : `<img src="${pc.id}/${f}" loading="lazy">`)).join('');
    return `<section><header><b>${esc(pc.id)}</b><span>${esc(pc.type)} · ${esc(pc.format || '')}</span></header>
      <div class="media">${media || `<p class="err">${esc(errors.join(' ') || 'Not rendered')}</p>`}</div>
      <pre>${esc(caption)}</pre></section>`;
  }).join('');
  return `<!doctype html><html lang="${esc(lang(p.plan.language).code)}"><meta charset="utf-8"><title>${esc(p.plan.title || p.id)}</title>
<style>body{margin:0;padding:32px;font:15px/1.5 system-ui,sans-serif;background:#f4f4f5;color:#18181b}h1{margin:0 0 4px}
.sub{color:#71717a;margin:0 0 24px}section{background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:20px;margin-bottom:24px}
header{display:flex;gap:12px;align-items:baseline;margin-bottom:14px}header span{color:#71717a}.media{display:flex;gap:12px;overflow-x:auto}
.media img{height:440px;border-radius:8px}.media video{height:620px;border-radius:8px;background:#000}.err{color:#b91c1c}
pre{white-space:pre-wrap;font:inherit;background:#f4f4f5;padding:14px;border-radius:10px;margin:14px 0 0}</style>
<h1>${esc(p.plan.title || p.id)}</h1><p class="sub">${esc(p.brand.name)} · ${esc(p.plan.platform)} · ${esc(p.plan.language)} · ${esc(p.plan.goal || '')}</p>${cards}`;
}

async function renderAll(p) {
  const outRoot = join(p.dir, 'out');
  mkdirSync(outRoot, { recursive: true });
  const pieces = p.plan.pieces.filter((pc) => !opts.only || pc.id === opts.only);
  const needsStills = pieces.some((pc) => pc.type !== 'video');
  const srv = needsStills ? await serve(ws()) : null;
  const browser = needsStills ? await launch() : null;
  const results = [];
  try {
    for (const pc of pieces) {
      const outDir = join(outRoot, pc.id);
      mkdirSync(outDir, { recursive: true });
      console.log(`• ${pc.id} (${pc.type})`);
      let files = [];
      const errors = [];
      try {
        if (pc.type === 'video') {
          const vdir = join(p.dir, pc.id);
          if (!existsSync(join(vdir, 'index.html'))) throw new Error(`video not created yet: sck video new ${p.id} ${pc.id}`);
          syncBrand({ ws: ws(), brand: p.brand, plan: p.plan, piece: pc, dir: vdir });
          applyTiming(pc, vdir);
          videoRender({ dir: vdir, output: join(outDir, `${pc.id}.mp4`), draft: opts.draft, docker: opts.docker ? true : opts.local ? false : undefined });
          files = [`${pc.id}.mp4`];
        } else {
          const r = await renderStills({ browser, base: srv.base, ws: ws(), project: p, plan: p.plan, brand: p.brand, piece: pc, outDir });
          files = r.files;
          r.warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
        }
        files.forEach((f) => console.log(`  ✓ ${relative(process.cwd(), join(outDir, f))}`));
      } catch (e) {
        errors.push(e.message);
        console.error(`  ✗ ${e.message}`);
      }
      const tags = (pc.hashtags || []).map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ');
      const caption = [pc.caption?.trim(), tags].filter(Boolean).join('\n\n') + '\n';
      writeFileSync(join(outDir, 'caption.txt'), caption);
      results.push({ pc, files, caption, errors });
    }
  } finally {
    await browser?.close();
    srv?.server.close();
  }
  const page = join(outRoot, opts.only ? `index-${opts.only}.html` : 'index.html');
  writeFileSync(page, reviewPage(p, results));
  console.log(`\nReview: ${page}`);
  return results.some((r) => r.errors.length) ? 1 : 0;
}

// ---------- main ----------

try {
  let code = 0;
  switch (cmd) {
    case undefined: case 'help': case '-h': case '--help': console.log(HELP); break;
    case 'doctor': doctor(); break;
    case 'languages': languages(); break;
    case 'setup': {
      if (sub !== 'voice') throw new Error('Usage: sck setup voice');
      const r = setupVoice();
      console.log(r.ok ? `✓ Kokoro ready (${r.python})` : `✗ ${r.hint}`);
      code = r.ok ? 0 : 1;
      break;
    }
    case 'brands': brands(); break;
    case 'brand': {
      if (sub === 'init') {
        const r = await brandInit(rest[0], ws(), { id: opts.id, force: opts.force });
        console.log(`Draft written to ${r.out}`);
        console.log(`  colors: ${r.scan.colors.slice(0, 8).map((c) => c.hex).join(' ')}`);
        console.log(`  fonts: ${r.scan.fonts.map((f) => f.family).join(', ') || '—'} (${r.fontFaces} font faces downloaded)`);
        console.log(`  logos: ${r.scan.logos.length} · photos: ${r.scan.photos.length} · landing files: ${r.scan.landing_candidates.length}`);
        console.log('Review and complete brand.json (tokens, voice, facts) using scan.json and the app\'s code.');
      } else if (sub === 'fonts') {
        const id = rest[0];
        const b = loadBrand(ws(), id);
        const n = await downloadFonts(b.fonts?.google || [], brandDir(ws(), id));
        b.fonts = { ...b.fonts, css: 'fonts.css' };
        writeFileSync(join(brandDir(ws(), id), 'brand.json'), JSON.stringify(b, null, 2) + '\n');
        console.log(`${n} font faces downloaded`);
      } else throw new Error('Usage: sck brand init <repo|folder> | sck brand fonts <id>');
      break;
    }
    case 'project':
      if (sub !== 'new') throw new Error('Usage: sck project new <name> --brand <id> --platform <p> --language <code>');
      projectNew(rest[0]);
      break;
    case 'video': {
      const p = project(rest[0]);
      const pc = piece(p, rest[1]);
      const dir = join(p.dir, pc.id);
      if (sub === 'new') { videoNew({ ws: ws(), brand: p.brand, plan: p.plan, piece: pc, dir, force: opts.force }); console.log(dir); }
      else if (sub === 'sync') { syncBrand({ ws: ws(), brand: p.brand, plan: p.plan, piece: pc, dir }); console.log('brand synced'); }
      else throw new Error('Usage: sck video new|sync <project> <piece>');
      break;
    }
    case 'voice': case 'timing': {
      const p = project(sub);
      const pc = piece(p, rest[0]);
      const dir = join(p.dir, pc.id);
      if (cmd === 'voice') synthesize(pc, dir, p.plan);
      else if (pc.voice !== null) voiceFor(pc, p.plan); // validates the language/voice early
      const t = applyTiming(pc, dir);
      for (const s of t.scenes) console.log(`  ${s.id.padEnd(16)} ${s.start.toFixed(2)}s → ${(s.start + s.duration).toFixed(2)}s${s.voice ? '  🎙' : ''}`);
      console.log(`Total ${t.total}s · ${t.captions} captions`);
      break;
    }
    case 'check': {
      const p = project(sub);
      code = videoCheck(join(p.dir, piece(p, rest[0]).id)) ? 0 : 1;
      break;
    }
    case 'snapshot': {
      const p = project(sub);
      const pc = piece(p, rest[0]);
      const dir = join(p.dir, pc.id);
      const at = opts.at ? String(opts.at).split(',').map(Number) : defaultSnapshotTimes(dir);
      console.log(videoSnapshot(dir, at, join(p.dir, 'out', pc.id, 'snapshots')));
      break;
    }
    case 'render': code = await renderAll(project(sub)); break;
    default: throw new Error(`Unknown command: ${cmd}\n\n${HELP}`);
  }
  process.exit(code);
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(1);
}
