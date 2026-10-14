// Voz en off (Kokoro, local), tiempos de escena y subtítulos.
//
// Cada escena con texto en "voice" se sintetiza por separado. Así la duración de cada frase se conoce
// exactamente: la escena dura lo que dura su locución (más un respiro) y los subtítulos se reparten
// dentro de esa toma según el largo de cada palabra. No hace falta transcribir.

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { KIT, has } from './paths.mjs';

export const VENV = join(homedir(), '.cache', 'social-content-kit', 'venv');
const venvPython = () => join(VENV, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');

const PRE = 0.15; // silencio antes de la voz dentro de la escena
const POST = 0.4; // respiro después

// Cualquier voz de Kokoro (npx hyperframes tts --list). En español: ef_dora, em_alex, em_santa.
export const DEFAULT_VOICE = { engine: 'kokoro', voice: 'ef_dora', speed: 1.0 };

export function setupVoice() {
  if (existsSync(venvPython())) {
    const ok = spawnSync(venvPython(), ['-c', 'import kokoro_onnx, soundfile'], { stdio: 'ignore' }).status === 0;
    if (ok) return { ok: true, python: venvPython() };
  } else {
    const r = spawnSync('python3', ['-m', 'venv', VENV], { stdio: 'inherit' });
    if (r.status !== 0) {
      return { ok: false, hint: 'No pude crear el entorno de Python. En Debian/Ubuntu: sudo apt install python3-venv (o python3.12-venv).' };
    }
  }
  const pip = spawnSync(venvPython(), ['-m', 'pip', 'install', '-q', 'kokoro-onnx', 'soundfile'], { stdio: 'inherit' });
  if (pip.status !== 0) return { ok: false, hint: 'Falló pip install kokoro-onnx soundfile.' };
  return { ok: true, python: venvPython() };
}

const duration = (file) =>
  Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim());

function tts(text, file, v) {
  const env = { ...process.env, HYPERFRAMES_PYTHON: venvPython(), HYPERFRAMES_SKIP_SKILLS: '1' };
  const args = ['hyperframes', 'tts', text, '-v', v.voice, '-s', String(v.speed ?? 1), '-o', file, '--json'];
  if (v.lang) args.push('-l', v.lang);
  const r = spawnSync('npx', args, { cwd: KIT, env, encoding: 'utf8' });
  if (r.status !== 0 || !existsSync(file)) throw new Error(`TTS falló: ${(r.stdout + r.stderr).trim().split('\n').pop()}`);
}

// Frases de subtítulo: hasta ~3 palabras / 22 caracteres, cortando en la puntuación.
export function chunk(text, maxWords = 3, maxChars = 22) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const out = [];
  let cur = [];
  for (const w of words) {
    const next = [...cur, w].join(' ');
    if (cur.length && (cur.length >= maxWords || next.length > maxChars)) {
      out.push(cur);
      cur = [];
    }
    cur.push(w);
    if (/[.,;:!?…]$/.test(w)) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out.map((ws) => ws.join(' '));
}

// Reparte la duración hablada entre las frases según su peso (letras + pausa por puntuación).
export function captionTimes(text, start, spoken) {
  const parts = chunk(text);
  const weight = (p) => p.replace(/[^\p{L}\p{N}]/gu, '').length + (/[.,;:!?…]$/.test(p) ? 4 : 1);
  const total = parts.reduce((a, p) => a + weight(p), 0) || 1;
  let t = start;
  return parts.map((p) => {
    const d = (weight(p) / total) * spoken;
    const c = { text: p.replace(/[,;:]$/, ''), start: +t.toFixed(3), end: +(t + d).toFixed(3) };
    t += d;
    return c;
  });
}

const hash = (o) => createHash('sha1').update(JSON.stringify(o)).digest('hex').slice(0, 12);

// Genera (o reutiliza) la voz de cada escena. Devuelve { sceneId: { file, duration } }.
export function synthesize(piece, dir) {
  const v = { ...DEFAULT_VOICE, ...(piece.voice || {}) };
  if (v.engine !== 'kokoro') throw new Error(`Motor de voz no soportado todavía: ${v.engine}. Usá "kokoro".`);
  if (!has('ffprobe')) throw new Error('Falta FFmpeg (ffprobe) para medir la voz.');
  const s = setupVoice();
  if (!s.ok) throw new Error(s.hint);

  const vdir = join(dir, 'assets', 'voice');
  mkdirSync(vdir, { recursive: true });
  const manifestFile = join(vdir, 'voice.json');
  const prev = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {};
  const manifest = {};

  for (const sc of piece.scenes) {
    if (!sc.voice?.trim()) continue;
    const key = hash({ text: sc.voice, v });
    const file = `${sc.id}.wav`;
    if (prev[sc.id]?.key === key && existsSync(join(vdir, file))) {
      manifest[sc.id] = prev[sc.id];
      continue;
    }
    console.log(`  voz: ${sc.id}`);
    tts(sc.voice, join(vdir, file), v);
    manifest[sc.id] = { key, file, duration: +duration(join(vdir, file)).toFixed(3) };
  }
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

// Calcula tiempos de escena, escribe captions.js y parchea index.html (data-start/duration y audios).
export function applyTiming(piece, dir) {
  const vdir = join(dir, 'assets', 'voice');
  mkdirSync(vdir, { recursive: true });
  const manifestFile = join(vdir, 'voice.json');
  const voice = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {};

  let t = 0;
  const scenes = [];
  const captions = [];
  for (const sc of piece.scenes) {
    const vo = voice[sc.id];
    const d = vo ? Math.max(PRE + vo.duration + POST, sc.min || 0) : sc.duration || 3;
    scenes.push({ id: sc.id, start: +t.toFixed(3), duration: +d.toFixed(3), voice: vo ? { file: vo.file, start: +(t + PRE).toFixed(3), duration: vo.duration } : null });
    // Kokoro deja ~0,1 s de aire al principio y al final de cada toma.
    if (vo && piece.captions !== false) captions.push(...captionTimes(sc.voice, t + PRE + 0.08, Math.max(vo.duration - 0.2, 0.3)));
    t += d;
  }
  const total = +t.toFixed(3);

  writeFileSync(join(vdir, 'captions.js'), `// Generado por "sck timing". No editar.\nwindow.__SCK_CAPTIONS__ = ${JSON.stringify(captions, null, 1)};\n`);

  const indexFile = join(dir, 'index.html');
  let html = readFileSync(indexFile, 'utf8');
  const setAttr = (tag, name, value) =>
    new RegExp(`\\s${name}="[^"]*"`).test(tag) ? tag.replace(new RegExp(`(\\s${name}=")[^"]*"`), `$1${value}"`) : tag.replace(/>$/, ` ${name}="${value}">`);

  for (const s of scenes) {
    const re = new RegExp(`<[^>]*data-scene="${s.id}"[^>]*>`);
    const m = html.match(re);
    if (!m) throw new Error(`index.html no tiene un elemento con data-scene="${s.id}" (escena del plan).`);
    html = html.replace(re, setAttr(setAttr(m[0], 'data-start', s.start), 'data-duration', s.duration));
  }
  html = html.replace(/<div id="root"[^>]*>/, (tag) => setAttr(tag, 'data-duration', total));

  const audios = scenes
    .filter((s) => s.voice)
    .map((s) => `      <audio id="vo-${s.id}" class="clip" src="assets/voice/${s.voice.file}" data-start="${s.voice.start}" data-duration="${s.voice.duration}" data-volume="1" data-track-index="9"></audio>`)
    .join('\n');
  html = html.replace(/<!-- sck:voice -->[\s\S]*?<!-- \/sck:voice -->/, `<!-- sck:voice -->\n${audios}\n      <!-- /sck:voice -->`);
  writeFileSync(indexFile, html);

  return { scenes, total, captions: captions.length };
}
