// sck brand init <repo|carpeta> --id <id>
// Escanea el código de una app y deja un borrador de marca en <workspace>/brands/<id>/:
//   brand.json   tokens, fuentes, voz y hechos (borrador: el agente lo completa y la persona lo confirma)
//   scan.json    todo lo encontrado, para que el agente decida
//   assets/      logos e imágenes copiados del repo, fonts/ descargadas de Google Fonts

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import { brandDir, resolveSource, slug } from './paths.mjs';

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.angular', '.svelte-kit', 'coverage', 'vendor', '.turbo', '.cache', 'out', 'target', '__pycache__', '.venv']);
const TEXT = new Set(['.css', '.scss', '.sass', '.less', '.html', '.htm', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.vue', '.svelte', '.astro', '.json', '.md']);
const IMG = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.avif']);

function walk(dir, files = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') && e.name !== '.storybook') continue;
    if (SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

// ---------- color ----------

function hexToRgb(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = ([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const saturation = ([r, g, b]) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
};

function colorInfo(counts) {
  return [...counts.entries()]
    .map(([hex, n]) => ({ hex, n, rgb: hexToRgb(hex) }))
    .filter((c) => c.rgb)
    .map((c) => ({ hex: toHex(c.rgb), count: c.n, lum: +luminance(c.rgb).toFixed(2), sat: +saturation(c.rgb).toFixed(2) }))
    .reduce((acc, c) => {
      const prev = acc.find((x) => x.hex === c.hex);
      prev ? (prev.count += c.count) : acc.push(c);
      return acc;
    }, [])
    .sort((a, b) => b.count - a.count);
}

// Primer borrador de tokens: el fondo claro más usado, la tinta oscura más usada y el color con más saturación.
function guessTokens(colors) {
  const pick = (f, fallback) => colors.find(f)?.hex || fallback;
  const bg = pick((c) => c.lum > 0.9, '#ffffff');
  const ink = pick((c) => c.lum < 0.2, '#111111');
  const accent = pick((c) => c.sat > 0.35 && c.lum > 0.2 && c.lum < 0.8, '#3b82f6');
  const second = pick((c) => c.sat > 0.35 && c.lum > 0.2 && c.lum < 0.8 && c.hex !== accent, accent);
  return {
    bg,
    surface: pick((c) => c.lum > 0.95 && c.hex !== bg, '#ffffff'),
    ink,
    'ink-soft': pick((c) => c.lum > 0.25 && c.lum < 0.5 && c.sat < 0.2, '#4b5563'),
    muted: pick((c) => c.lum >= 0.4 && c.lum < 0.65 && c.sat < 0.2, '#6b7280'),
    line: 'rgba(0, 0, 0, 0.08)',
    'on-ink': '#ffffff',
    accent,
    positive: second,
    'font-display': 'system-ui, sans-serif',
    'font-body': 'system-ui, sans-serif',
    radius: '28px',
  };
}

// ---------- escaneo ----------

export function scan(dir) {
  const files = walk(dir);
  const colors = new Map();
  const vars = new Map();
  const families = new Map();
  const googleFonts = new Set();
  const titles = new Set();
  const descriptions = new Set();
  const landing = [];

  for (const f of files) {
    const ext = extname(f).toLowerCase();
    if (!TEXT.has(ext) || statSync(f).size > 400_000) continue;
    if (ext === '.json' && !/tailwind|theme|tokens/i.test(f)) continue;
    const src = readFileSync(f, 'utf8');
    const rel = relative(dir, f);

    for (const m of src.matchAll(/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
      const k = m[0].toLowerCase();
      colors.set(k, (colors.get(k) || 0) + 1);
    }
    for (const m of src.matchAll(/(--[\w-]+)\s*:\s*([^;}{\n]+)/g)) {
      if (/#|rgb|hsl|oklch|color-mix/.test(m[2])) vars.set(m[1], m[2].trim());
    }
    for (const m of src.matchAll(/font-family\s*:\s*([^;}{\n]+)/gi)) {
      const fam = m[1].split(',')[0].trim().replace(/["']/g, '');
      if (fam && !fam.startsWith('$') && !fam.startsWith('var(') && !/inherit|initial/.test(fam)) families.set(fam, (families.get(fam) || 0) + 1);
    }
    for (const m of src.matchAll(/https:\/\/fonts\.googleapis\.com\/css2?\?[^"'\s)]+/g)) googleFonts.add(m[0].replace(/&amp;/g, '&'));
    for (const m of src.matchAll(/<title>([^<]{2,80})<\/title>/gi)) titles.add(m[1].trim());
    for (const m of src.matchAll(/<meta\s+name=["']description["']\s+content=["']([^"']+)/gi)) descriptions.add(m[1].trim());
    if (/landing|home|hero|index\.html$|page\.(t|j)sx?$/i.test(rel) && /\.(html|tsx|jsx|vue|svelte|astro|ts)$/.test(rel)) landing.push(rel);
  }

  const images = files
    .filter((f) => IMG.has(extname(f).toLowerCase()))
    .map((f) => ({ path: relative(dir, f), kb: +(statSync(f).size / 1024).toFixed(1) }))
    .filter((i) => i.kb > 0 && i.kb < 5000);
  const logos = images.filter((i) => /logo|favicon|brand|isotipo|icon\.(svg|png)|mark/i.test(i.path));
  const photos = images.filter((i) => !logos.includes(i) && i.kb > 30 && /\.(jpe?g|png|webp|avif)$/i.test(i.path)).sort((a, b) => b.kb - a.kb).slice(0, 40);

  const readme = ['README.md', 'readme.md', 'README'].map((n) => join(dir, n)).find(existsSync);

  return {
    colors: colorInfo(colors).slice(0, 30),
    css_vars: Object.fromEntries([...vars.entries()].slice(0, 60)),
    fonts: [...families.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([family, count]) => ({ family, count })),
    google_fonts: [...googleFonts],
    titles: [...titles],
    descriptions: [...descriptions],
    readme_excerpt: readme ? readFileSync(readme, 'utf8').slice(0, 2500) : null,
    landing_candidates: landing.slice(0, 20),
    logos,
    photos,
  };
}

// ---------- Google Fonts ----------

// Descarga los woff2 (latin y latin-ext) de las URLs de Google Fonts y arma fonts.css local.
export async function downloadFonts(urls, outDir) {
  const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
  mkdirSync(join(outDir, 'fonts'), { recursive: true });
  const faces = [];
  const seen = new Map();
  for (const url of urls) {
    if (/family=Material\+(Icons|Symbols)/.test(url)) continue;
    const css = await (await fetch(url, { headers: { 'user-agent': UA } })).text();
    for (const block of css.split(/(?=\/\* [\w-]+ \*\/)/)) {
      if (!/^\/\* latin(-ext)? \*\//.test(block)) continue;
      const src = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/)?.[1];
      if (!src) continue;
      if (!seen.has(src)) {
        const family = block.match(/font-family:\s*'([^']+)'/)?.[1] || 'font';
        const style = block.match(/font-style:\s*(\w+)/)?.[1] || 'normal';
        const file = `${slug(family)}-${style}-${seen.size + 1}.woff2`;
        const buf = Buffer.from(await (await fetch(src)).arrayBuffer());
        writeFileSync(join(outDir, 'fonts', file), buf);
        seen.set(src, file);
      }
      faces.push(block.replace(src, `./fonts/${seen.get(src)}`).trim());
    }
  }
  writeFileSync(join(outDir, 'fonts.css'), faces.join('\n') + '\n');
  return faces.length;
}

// ---------- comando ----------

export async function init(input, ws, opts = {}) {
  const source = resolveSource(input, ws);
  const id = opts.id || slug(basename(source.dir));
  const out = brandDir(ws, id);
  const brandFile = join(out, 'brand.json');
  if (existsSync(brandFile) && !opts.force) throw new Error(`Ya existe ${brandFile}. Usá --force para regenerar el borrador.`);

  const s = scan(source.dir);
  mkdirSync(join(out, 'assets', 'logos'), { recursive: true });
  mkdirSync(join(out, 'assets', 'photos'), { recursive: true });
  mkdirSync(join(out, 'assets', 'screens'), { recursive: true });
  // Nombres únicos: dos "hero.png" de carpetas distintas no se pisan.
  const used = new Set();
  const copy = (item, sub) => {
    let name = basename(item.path);
    for (let i = 2; used.has(`${sub}/${name}`); i++) name = basename(item.path).replace(/(\.\w+)$/, `-${i}$1`);
    used.add(`${sub}/${name}`);
    copyFileSync(join(source.dir, item.path), join(out, 'assets', sub, name));
    item.copied_as = `${sub}/${name}`;
  };
  s.logos.slice(0, 12).forEach((l) => copy(l, 'logos'));
  s.photos.forEach((p) => copy(p, 'photos'));

  let fontFaces = 0;
  if (s.google_fonts.length) {
    try {
      fontFaces = await downloadFonts(s.google_fonts, out);
    } catch (e) {
      console.warn(`No pude bajar las fuentes de Google (${e.message}). Se puede reintentar con: sck brand fonts ${id}`);
    }
  }

  const tokens = guessTokens(s.colors);
  const [display, body] = [s.fonts[0]?.family, s.fonts[1]?.family || s.fonts[0]?.family];
  if (display) tokens['font-display'] = `'${display}', system-ui, sans-serif`;
  if (body) tokens['font-body'] = `'${body}', system-ui, sans-serif`;

  const brand = {
    id,
    name: s.titles[0] || id,
    status: 'draft',
    handle: '',
    source: { kind: source.kind, ref: source.ref, dir: source.dir },
    tokens,
    fonts: { google: s.google_fonts, css: fontFaces ? 'fonts.css' : null },
    logo: s.logos[0]?.copied_as || null,
    voice: { language: '', rules: [], examples: [] },
    facts: { pitch: s.descriptions[0] || '', features: [], plans: [], cta: '' },
    photos: Object.fromEntries(s.photos.map((p) => [p.copied_as, ''])),
  };
  writeFileSync(join(out, 'scan.json'), JSON.stringify(s, null, 2) + '\n');
  writeFileSync(brandFile, JSON.stringify(brand, null, 2) + '\n');
  return { id, out, source, scan: s, fontFaces };
}
