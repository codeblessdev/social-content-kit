// Videos: proyecto HyperFrames por pieza en <workspace>/projects/<proyecto>/<pieza>/.

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SAFE, sizeFor } from './formats.mjs';
import { KIT, brandDir, has } from './paths.mjs';

const hfEnv = () => ({ ...process.env, HYPERFRAMES_SKIP_SKILLS: '1' });

// Copia la marca dentro del proyecto de video (HyperFrames solo ve su propia carpeta, sobre todo en Docker).
export function syncBrand({ ws, brand, plan, piece, dir }) {
  const bDir = brandDir(ws, brand.id);
  const out = join(dir, 'assets', 'brand');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  if (existsSync(join(bDir, 'assets'))) cpSync(join(bDir, 'assets'), out, { recursive: true });
  if (existsSync(join(bDir, 'fonts'))) cpSync(join(bDir, 'fonts'), join(out, 'fonts'), { recursive: true });
  const fontsCss = brand.fonts?.css && existsSync(join(bDir, brand.fonts.css)) ? readFileSync(join(bDir, brand.fonts.css), 'utf8') : '';
  writeFileSync(join(out, 'fonts.css'), fontsCss);
  const vars = Object.entries(brand.tokens || {}).map(([k, v]) => `  --${k}: ${v};`).join('\n');
  writeFileSync(join(out, 'brand.css'), `/* Generado desde brands/${brand.id}/brand.json */\n:root {\n${vars}\n}\n`);

  const [w, h] = sizeFor(plan.platform, piece);
  const [top, bottom] = SAFE[plan.platform]?.[piece.format] || (h > w ? [160, 320] : [60, 60]);
  writeFileSync(join(dir, 'assets', 'sck.css'), `/* Generado por sck */\n:root {\n  --w: ${w}px;\n  --h: ${h}px;\n  --safe-top: ${top}px;\n  --safe-bottom: ${bottom}px;\n}\n`);
}

export function create({ ws, brand, plan, piece, dir, force }) {
  if (existsSync(join(dir, 'index.html')) && !force) throw new Error(`${dir} ya existe. Usá --force para empezar de nuevo.`);
  const [w, h] = sizeFor(plan.platform, piece);
  cpSync(join(KIT, 'templates', 'video'), dir, { recursive: true });
  const index = join(dir, 'index.html');
  writeFileSync(index, readFileSync(index, 'utf8').replaceAll('{{W}}', w).replaceAll('{{H}}', h));
  mkdirSync(join(dir, 'assets', 'voice'), { recursive: true });
  writeFileSync(join(dir, 'assets', 'voice', 'captions.js'), 'window.__SCK_CAPTIONS__ = [];\n');
  syncBrand({ ws, brand, plan, piece, dir });
}

export function check(dir) {
  const r = spawnSync('npx', ['hyperframes', 'check', dir], { cwd: KIT, env: hfEnv(), stdio: 'inherit' });
  return r.status === 0;
}

export function snapshot(dir, at, outDir) {
  const r = spawnSync('npx', ['hyperframes', 'snapshot', dir, '--at', at.join(','), '--no-end', '-o', outDir], { cwd: KIT, env: hfEnv(), stdio: 'inherit' });
  if (r.status !== 0) throw new Error('Falló el snapshot');
  return join(outDir, 'contact-sheet.jpg');
}

export function render({ dir, output, draft, docker }) {
  const useDocker = docker === true || (docker !== false && !has('ffmpeg') && has('docker'));
  if (!useDocker && !has('ffmpeg')) throw new Error('Para renderizar video hace falta FFmpeg o Docker.');
  const args = ['hyperframes', 'render', dir, '-o', output, '-q', draft ? 'draft' : 'delivery'];
  if (useDocker) args.push('--docker');
  console.log(`  render ${useDocker ? '(docker)' : '(local)'}${draft ? ' borrador' : ''}… (puede tardar unos minutos)`);
  const r = spawnSync('npx', args, { cwd: KIT, env: hfEnv(), encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  // HyperFrames loguea cada fase en JSON; mostramos solo lo útil.
  const lines = `${r.stdout}\n${r.stderr}`.split('\n').filter((l) => l.trim() && !/^\[(INFO|HyperFrames|hyperframes)\]|telemetry|anonymous|collected|HeyGen, your|Framey|studio\/download/.test(l));
  if (r.status !== 0) {
    console.error(lines.slice(-25).join('\n'));
    throw new Error('Falló el render del video');
  }
  console.log(lines.filter((l) => /rendered in|KB|MB|warn|⚠/i.test(l)).map((l) => `  ${l.trim()}`).join('\n'));
}
