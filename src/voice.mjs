// Voice-over (Kokoro, local), scene timing and captions.
//
// Each scene's "voice" line is synthesized as its own take, so its exact duration is known: the scene lasts as long
// as its narration (plus a short pause) and captions are spread inside that take by word length. No transcription needed.

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { lang } from './i18n.mjs';
import { KIT, has } from './paths.mjs';

export const VENV = join(homedir(), '.cache', 'social-content-kit', 'venv');
const venvPython = () => join(VENV, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');

const PRE = 0.15; // silence before the voice inside the scene
const POST = 0.4; // pause after it

export function setupVoice() {
  if (existsSync(venvPython())) {
    const ok = spawnSync(venvPython(), ['-c', 'import kokoro_onnx, soundfile'], { stdio: 'ignore' }).status === 0;
    if (ok) return { ok: true, python: venvPython() };
  } else {
    const r = spawnSync('python3', ['-m', 'venv', VENV], { stdio: 'inherit' });
    if (r.status !== 0) {
      return { ok: false, hint: 'Could not create the Python environment. On Debian/Ubuntu: sudo apt install python3-venv (or python3.12-venv).' };
    }
  }
  const pip = spawnSync(venvPython(), ['-m', 'pip', 'install', '-q', 'kokoro-onnx', 'soundfile'], { stdio: 'inherit' });
  if (pip.status !== 0) return { ok: false, hint: 'pip install kokoro-onnx soundfile failed.' };
  return { ok: true, python: venvPython() };
}

// Voice settings for a piece: explicit values in the plan win; otherwise the default voice of the plan's language.
export function voiceFor(piece, plan = {}) {
  const l = lang(plan.language);
  const v = { engine: 'kokoro', speed: 1.0, gender: 'female', ...(piece.voice || {}) };
  if (!v.voice) {
    if (l.known === false) throw new Error(`No default voice for language "${plan.language}". Set "voice": { "voice": "<kokoro id>", "lang": "<code>" } in the piece.`);
    v.voice = l.voices[v.gender] || l.voices.female;
  }
  if (!v.lang && l.tts) v.lang = l.tts;
  return v;
}

const duration = (file) =>
  Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim());

function tts(text, file, v) {
  const env = { ...process.env, HYPERFRAMES_PYTHON: venvPython(), HYPERFRAMES_SKIP_SKILLS: '1' };
  const args = ['hyperframes', 'tts', text, '-v', v.voice, '-s', String(v.speed ?? 1), '-o', file, '--json'];
  if (v.lang) args.push('-l', v.lang);
  const r = spawnSync('npx', args, { cwd: KIT, env, encoding: 'utf8' });
  if (r.status !== 0 || !existsSync(file)) throw new Error(`TTS failed: ${(r.stdout + r.stderr).trim().split('\n').pop()}`);
}

const END_PUNCT = /[.,;:!?…。、，！？；：]$/;

// Caption phrases: up to ~3 words / 22 characters, breaking at punctuation.
// Languages written without spaces (Japanese, Chinese) are split every ~12 characters instead.
export function chunk(text, maxWords = 3, maxChars = 22) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean.includes(' ') && clean.length > 12) {
    const out = [];
    let cur = '';
    for (const ch of clean) {
      cur += ch;
      if (END_PUNCT.test(ch) || cur.length >= 12) {
        out.push(cur);
        cur = '';
      }
    }
    if (cur) out.push(cur);
    return out;
  }
  const words = clean.split(' ').filter(Boolean);
  const out = [];
  let cur = [];
  for (const w of words) {
    const next = [...cur, w].join(' ');
    if (cur.length && (cur.length >= maxWords || next.length > maxChars)) {
      out.push(cur);
      cur = [];
    }
    cur.push(w);
    if (END_PUNCT.test(w)) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out.map((ws) => ws.join(' '));
}

// Spreads the spoken duration across phrases by weight (letters + a pause for punctuation).
export function captionTimes(text, start, spoken) {
  const parts = chunk(text);
  const weight = (p) => p.replace(/[^\p{L}\p{N}]/gu, '').length + (END_PUNCT.test(p) ? 4 : 1);
  const total = parts.reduce((a, p) => a + weight(p), 0) || 1;
  let t = start;
  return parts.map((p) => {
    const d = (weight(p) / total) * spoken;
    const c = { text: p.replace(/[,;:、，；：]$/, ''), start: +t.toFixed(3), end: +(t + d).toFixed(3) };
    t += d;
    return c;
  });
}

const hash = (o) => createHash('sha1').update(JSON.stringify(o)).digest('hex').slice(0, 12);

// Generates (or reuses) each scene's voice. Returns { sceneId: { file, duration } }.
export function synthesize(piece, dir, plan) {
  const v = voiceFor(piece, plan);
  if (v.engine !== 'kokoro') throw new Error(`Voice engine not supported yet: ${v.engine}. Use "kokoro".`);
  if (!has('ffprobe')) throw new Error('FFmpeg (ffprobe) is required to measure the voice-over.');
  const s = setupVoice();
  if (!s.ok) throw new Error(s.hint);

  const vdir = join(dir, 'assets', 'voice');
  mkdirSync(vdir, { recursive: true });
  const manifestFile = join(vdir, 'voice.json');
  const prev = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {};
  const manifest = {};

  console.log(`  voice: ${v.voice} (${v.lang || 'auto'}, speed ${v.speed})`);
  for (const sc of piece.scenes) {
    if (!sc.voice?.trim()) continue;
    const key = hash({ text: sc.voice, voice: v.voice, lang: v.lang, speed: v.speed });
    const file = `${sc.id}.wav`;
    if (prev[sc.id]?.key === key && existsSync(join(vdir, file))) {
      manifest[sc.id] = prev[sc.id];
      continue;
    }
    console.log(`  synthesizing: ${sc.id}`);
    tts(sc.voice, join(vdir, file), v);
    manifest[sc.id] = { key, file, duration: +duration(join(vdir, file)).toFixed(3) };
  }
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

// Computes scene timing, writes captions.js and patches index.html (data-start/duration and audio clips).
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
    // Kokoro leaves ~0.1 s of air at the start and end of each take.
    if (vo && piece.captions !== false) captions.push(...captionTimes(sc.voice, t + PRE + 0.08, Math.max(vo.duration - 0.2, 0.3)));
    t += d;
  }
  const total = +t.toFixed(3);

  writeFileSync(join(vdir, 'captions.js'), `// Generated by "sck timing". Do not edit.\nwindow.__SCK_CAPTIONS__ = ${JSON.stringify(captions, null, 1)};\n`);

  const indexFile = join(dir, 'index.html');
  let html = readFileSync(indexFile, 'utf8');
  const setAttr = (tag, name, value) =>
    new RegExp(`\\s${name}="[^"]*"`).test(tag) ? tag.replace(new RegExp(`(\\s${name}=")[^"]*"`), `$1${value}"`) : tag.replace(/>$/, ` ${name}="${value}">`);

  for (const s of scenes) {
    const re = new RegExp(`<[^>]*data-scene="${s.id}"[^>]*>`);
    const m = html.match(re);
    if (!m) throw new Error(`index.html has no element with data-scene="${s.id}" (a scene in the plan).`);
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
