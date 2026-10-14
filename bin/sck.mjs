#!/usr/bin/env node
// sck — social content kit. Ver README.md o "sck help".

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { downloadFonts, init as brandInit } from '../src/brand.mjs';
import { FORMATS } from '../src/formats.mjs';
import { brandDir, has, loadBrand, projectDir, slug, workspace } from '../src/paths.mjs';
import { serve } from '../src/server.mjs';
import { chromePath, launch, renderStills } from '../src/still.mjs';
import { create as videoNew, check as videoCheck, render as videoRender, snapshot as videoSnapshot, syncBrand } from '../src/video.mjs';
import { VENV, applyTiming, setupVoice, synthesize } from '../src/voice.mjs';

const HELP = `sck — genera imágenes, carruseles y videos para redes con la línea visual de una app.

Workspace: --workspace <dir> | $SCK_WORKSPACE | ./social-content

  sck doctor                               qué está instalado y qué falta
  sck setup voice                          instala Kokoro (voz local) en ${VENV}

  sck brands                               marcas del workspace
  sck brand init <repo-url|owner/repo|carpeta> [--id x] [--force]
                                           escanea la app y deja un borrador de marca
  sck brand fonts <id>                     vuelve a bajar las fuentes de Google de la marca

  sck project new <nombre> --brand <id> --platform <p>
                                           crea projects/<fecha>-<nombre>/plan.json
  sck video new <proyecto> <pieza> [--force]  arma el proyecto HyperFrames de una pieza de video
  sck video sync <proyecto> <pieza>        recopia la marca dentro del video
  sck voice <proyecto> <pieza>             genera la voz (Kokoro) y aplica tiempos y subtítulos
  sck timing <proyecto> <pieza>            recalcula tiempos y subtítulos sin regenerar la voz
  sck check <proyecto> <pieza>             valida la composición (lint, runtime, contraste)
  sck snapshot <proyecto> <pieza> [--at 1,4.5]  PNG de cuadros clave (por defecto, mitad de cada escena)
  sck render <proyecto> [--only <pieza>] [--draft] [--docker|--local]
                                           renderiza todo y arma out/index.html para revisar

Plataformas y formatos: ${Object.entries(FORMATS).map(([p, f]) => `${p} (${Object.keys(f).join(', ')})`).join('; ')}`;

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
  if (!name) throw new Error('Falta el proyecto.');
  const direct = resolve(name);
  const dir = existsSync(join(direct, 'plan.json')) ? direct : projectDir(ws(), name);
  const planFile = join(dir, 'plan.json');
  if (!existsSync(planFile)) throw new Error(`No encuentro ${planFile}`);
  const plan = JSON.parse(readFileSync(planFile, 'utf8'));
  validate(plan);
  return { dir, id: basename(dir), plan, brand: loadBrand(ws(), plan.brand) };
}

function piece(p, id) {
  const found = p.plan.pieces.find((x) => x.id === id);
  if (!found) throw new Error(`El plan no tiene la pieza "${id}". Piezas: ${p.plan.pieces.map((x) => x.id).join(', ')}`);
  return found;
}

function validate(plan) {
  const errs = [];
  if (!plan.brand) errs.push('falta "brand"');
  if (!plan.platform) errs.push('falta "platform"');
  if (!Array.isArray(plan.pieces) || !plan.pieces.length) errs.push('"pieces" vacío');
  for (const pc of plan.pieces || []) {
    if (!pc.id || !/^[a-z0-9-]+$/.test(pc.id)) errs.push(`pieza con id inválido: ${pc.id}`);
    if (!['image', 'carousel', 'video'].includes(pc.type)) errs.push(`${pc.id}: type debe ser image | carousel | video`);
    if (pc.type === 'image' && !pc.slide) errs.push(`${pc.id}: falta "slide"`);
    if (pc.type === 'carousel' && !pc.slides?.length) errs.push(`${pc.id}: faltan "slides"`);
    if (pc.type === 'video' && !pc.scenes?.length) errs.push(`${pc.id}: faltan "scenes"`);
    for (const sc of pc.scenes || []) if (!sc.id || !/^[a-z0-9-]+$/.test(sc.id)) errs.push(`${pc.id}: escena con id inválido: ${sc.id}`);
  }
  if (errs.length) throw new Error(`plan.json inválido:\n  - ${errs.join('\n  - ')}`);
}

// ---------- comandos ----------

function doctor() {
  const py = existsSync(join(VENV, 'bin', 'python')) || existsSync(join(VENV, 'Scripts', 'python.exe'));
  let chrome = null;
  try { chrome = chromePath(); } catch {}
  const rows = [
    ['Node', process.versions.node, Number(process.versions.node.split('.')[0]) >= 22, 'Node 22 o más nuevo'],
    ['Chrome', chrome || 'no', !!chrome, 'instalá Google Chrome o definí CHROME_PATH'],
    ['FFmpeg', has('ffmpeg') ? 'sí' : 'no', has('ffmpeg'), 'para video local y voz: sudo apt install ffmpeg | brew install ffmpeg'],
    ['Docker', has('docker') ? 'sí' : 'no', true, 'opcional: render determinista con --docker'],
    ['Voz (Kokoro)', py ? VENV : 'no', py, 'opcional: sck setup voice'],
    ['git', has('git') ? 'sí' : 'no', has('git'), 'para usar links de repos'],
  ];
  for (const [name, val, ok, hint] of rows) console.log(`${ok ? '✓' : '✗'} ${name.padEnd(13)} ${val}${ok ? '' : `  → ${hint}`}`);
  console.log(`\nWorkspace: ${ws()}`);
}

function brands() {
  const dir = join(ws(), 'brands');
  const list = existsSync(dir) ? readdirSync(dir).filter((d) => existsSync(join(dir, d, 'brand.json'))) : [];
  if (!list.length) return console.log('No hay marcas todavía. Creá una con: sck brand init <repo|carpeta>');
  for (const id of list) {
    const b = JSON.parse(readFileSync(join(dir, id, 'brand.json'), 'utf8'));
    console.log(`${id.padEnd(20)} ${b.name}${b.status === 'draft' ? '  (borrador)' : ''}  ← ${b.source?.ref || ''}`);
  }
}

function projectNew(name) {
  if (!name || !opts.brand || !opts.platform) throw new Error('Uso: sck project new <nombre> --brand <id> --platform <plataforma>');
  loadBrand(ws(), opts.brand);
  const dir = projectDir(ws(), `${today()}-${slug(name)}`);
  if (existsSync(join(dir, 'plan.json'))) throw new Error(`Ya existe ${dir}`);
  mkdirSync(dir, { recursive: true });
  const plan = { brand: opts.brand, platform: opts.platform, goal: opts.goal || '', title: name, status: 'draft', pieces: [] };
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
      <div class="media">${media || `<p class="err">${esc(errors.join(' ') || 'Sin render')}</p>`}</div>
      <pre>${esc(caption)}</pre></section>`;
  }).join('');
  return `<!doctype html><meta charset="utf-8"><title>${esc(p.plan.title || p.id)}</title>
<style>body{margin:0;padding:32px;font:15px/1.5 system-ui,sans-serif;background:#f4f4f5;color:#18181b}h1{margin:0 0 4px}
.sub{color:#71717a;margin:0 0 24px}section{background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:20px;margin-bottom:24px}
header{display:flex;gap:12px;align-items:baseline;margin-bottom:14px}header span{color:#71717a}.media{display:flex;gap:12px;overflow-x:auto}
.media img{height:440px;border-radius:8px}.media video{height:620px;border-radius:8px;background:#000}.err{color:#b91c1c}
pre{white-space:pre-wrap;font:inherit;background:#f4f4f5;padding:14px;border-radius:10px;margin:14px 0 0}</style>
<h1>${esc(p.plan.title || p.id)}</h1><p class="sub">${esc(p.brand.name)} · ${esc(p.plan.platform)} · ${esc(p.plan.goal || '')}</p>${cards}`;
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
          if (!existsSync(join(vdir, 'index.html'))) throw new Error(`falta el video: sck video new ${p.id} ${pc.id}`);
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
  console.log(`\nRevisión: ${page}`);
  return results.some((r) => r.errors.length) ? 1 : 0;
}

// ---------- main ----------

try {
  let code = 0;
  switch (cmd) {
    case undefined: case 'help': case '-h': console.log(HELP); break;
    case 'doctor': doctor(); break;
    case 'setup': {
      if (sub !== 'voice') throw new Error('Uso: sck setup voice');
      const r = setupVoice();
      console.log(r.ok ? `✓ Kokoro listo (${r.python})` : `✗ ${r.hint}`);
      code = r.ok ? 0 : 1;
      break;
    }
    case 'brands': brands(); break;
    case 'brand': {
      if (sub === 'init') {
        const r = await brandInit(rest[0], ws(), { id: opts.id, force: opts.force });
        console.log(`Borrador en ${r.out}`);
        console.log(`  colores: ${r.scan.colors.slice(0, 8).map((c) => c.hex).join(' ')}`);
        console.log(`  fuentes: ${r.scan.fonts.map((f) => f.family).join(', ') || '—'} (${r.fontFaces} caras descargadas)`);
        console.log(`  logos: ${r.scan.logos.length} · fotos: ${r.scan.photos.length} · archivos de landing: ${r.scan.landing_candidates.length}`);
        console.log('Revisá y completá brand.json (tokens, voz, facts) con scan.json y el código de la app.');
      } else if (sub === 'fonts') {
        const id = rest[0];
        const b = loadBrand(ws(), id);
        const n = await downloadFonts(b.fonts?.google || [], brandDir(ws(), id));
        b.fonts = { ...b.fonts, css: 'fonts.css' };
        writeFileSync(join(brandDir(ws(), id), 'brand.json'), JSON.stringify(b, null, 2) + '\n');
        console.log(`${n} caras de fuente descargadas`);
      } else throw new Error('Uso: sck brand init <repo|carpeta> | sck brand fonts <id>');
      break;
    }
    case 'project':
      if (sub !== 'new') throw new Error('Uso: sck project new <nombre> --brand <id> --platform <p>');
      projectNew(rest[0]);
      break;
    case 'video': {
      const p = project(rest[0]);
      const pc = piece(p, rest[1]);
      const dir = join(p.dir, pc.id);
      if (sub === 'new') { videoNew({ ws: ws(), brand: p.brand, plan: p.plan, piece: pc, dir, force: opts.force }); console.log(dir); }
      else if (sub === 'sync') { syncBrand({ ws: ws(), brand: p.brand, plan: p.plan, piece: pc, dir }); console.log('marca sincronizada'); }
      else throw new Error('Uso: sck video new|sync <proyecto> <pieza>');
      break;
    }
    case 'voice': case 'timing': {
      const p = project(sub);
      const pc = piece(p, rest[0]);
      const dir = join(p.dir, pc.id);
      if (cmd === 'voice') synthesize(pc, dir);
      const t = applyTiming(pc, dir);
      for (const s of t.scenes) console.log(`  ${s.id.padEnd(16)} ${s.start.toFixed(2)}s → ${(s.start + s.duration).toFixed(2)}s${s.voice ? '  🎙' : ''}`);
      console.log(`Total ${t.total}s · ${t.captions} subtítulos`);
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
    default: throw new Error(`Comando desconocido: ${cmd}\n\n${HELP}`);
  }
  process.exit(code);
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(1);
}
