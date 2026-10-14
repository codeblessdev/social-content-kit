// Builds one slide from window.__STILL__ = { brand, slide, index, total, size, fontsCss, assetBase, lang, ui }.
// Injected by src/still.mjs. Text uses *asterisks* for the italic punchline and \n for line breaks.

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const rich = (s = '') => esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');

let asset = (p) => p;
let ui = { swipe: 'Swipe', recommended: 'Recommended' };

function head(s, size = 'lg') {
  return `
    <div class="stack">
      ${s.kicker ? `<p class="kicker">${esc(s.kicker)}</p>` : ''}
      ${s.title ? `<h1 class="display ${s.size || size}">${rich(s.title)}</h1>` : ''}
      ${s.text ? `<p class="lead">${rich(s.text)}</p>` : ''}
    </div>`;
}

function widget(w = {}) {
  let detail = '';
  if (w.kind === 'bars') {
    detail = `<div class="bars">${(w.data || []).map((v) => `<i style="--v:${Number(v) || 0}%"></i>`).join('')}</div>`;
  } else if (w.kind === 'locs') {
    const max = Math.max(...(w.data || []).map((d) => Number(d.value) || 0), 1);
    detail = `<div class="locs">${(w.data || [])
      .map((d) => `<div class="loc"><div><span>${esc(d.label)}</span><b>${esc(d.value)}</b></div><i style="--v:${((Number(d.value) || 0) / max) * 100}%"></i></div>`)
      .join('')}</div>`;
  } else if (w.kind === 'ranks') {
    detail = `<div class="ranks">${(w.data || []).map((d) => `<div><span>${esc(d.label)}</span><b>${esc(d.value)}</b></div>`).join('')}</div>`;
  }
  return `
    <article class="card widget">
      <div class="widget-top"><span>${esc(w.label)}</span><strong>${esc(w.value)}</strong></div>
      ${w.note ? `<p class="note">${esc(w.note)}</p>` : ''}
      ${w.delta ? `<span class="delta">${esc(w.delta)}</span>` : ''}
      ${detail}
    </article>`;
}

const LAYOUTS = {
  cover: (s) => `<div class="push">${head(s, 'xl')}</div>`,
  statement: (s) => `<div class="push">${head(s, 'xl')}</div>`,
  photo: (s) => `
    ${head(s, 'md')}
    <figure class="photo"><img src="${asset(s.photo)}" alt=""></figure>
    ${s.caption ? `<p class="caption">${esc(s.caption)}</p>` : ''}`,
  screen: (s) => `
    ${head(s, 'md')}
    <div class="shot"><img src="${asset(s.photo)}" alt=""></div>`,
  split: (s) => `
    ${s.kicker ? `<p class="kicker">${esc(s.kicker)}</p>` : ''}
    <div class="row">
      <figure class="photo"><img src="${asset(s.photo)}" alt=""></figure>
      <div class="stack">
        <h1 class="display md">${rich(s.title)}</h1>
        ${s.text ? `<p class="lead">${rich(s.text)}</p>` : ''}
      </div>
    </div>`,
  stat: (s) => `${head(s, 'md')}${widget(s.widget)}`,
  step: (s) => `<div class="step-n">${esc(s.n)}</div><div class="push">${head(s)}</div>`,
  list: (s) => `
    ${head(s, 'md')}
    <ol class="list">${(s.items || [])
      .map((it, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></div></li>`)
      .join('')}</ol>`,
  plans: (s, brand) => `
    ${head(s, 'md')}
    <div class="plans">${(s.plans || brand.facts?.plans || [])
      .map((p) => `
        <article class="card plan ${p.featured ? 'featured' : ''}">
          ${p.featured ? `<span class="tag">${esc(ui.recommended)}</span>` : ''}
          <h3>${esc(p.name)}</h3>
          <span class="price">${esc(p.price)}</span>
          <span class="note">${esc(p.note)}</span>
          ${p.extra ? `<span class="extra">${esc(p.extra)}</span>` : ''}
        </article>`)
      .join('')}</div>`,
  cta: (s, brand) => `
    <div class="push stack">
      ${head(s, 'xl')}
      ${s.cta || brand.facts?.cta ? `<span class="pill">${esc(s.cta || brand.facts.cta)}</span>` : ''}
    </div>`,
};

function footer(brand, index, total, ink) {
  const mark = brand.logo
    ? `<span class="mark img"><img src="${asset(brand.logo)}" alt=""></span>`
    : `<span class="mark">${esc((brand.name || '?')[0])}</span>`;
  let right = brand.handle ? `<span>${esc(brand.handle)}</span>` : '';
  if (total > 1) {
    const dots = Array.from({ length: total }, (_, i) => `<i class="${i === index ? 'on' : ''}"></i>`).join('');
    right = index === 0 && !ink ? `<span class="swipe">${esc(ui.swipe)}</span>` : `<span class="pager">${dots}</span>`;
  }
  return `<footer class="foot"><span class="brand">${mark}${esc(brand.name)}</span>${right}</footer>`;
}

async function render({ brand, slide, index = 0, total = 1, size = [1080, 1350], fontsCss, assetBase, lang = 'en', ui: strings }) {
  if (strings) ui = strings;
  document.documentElement.lang = lang;
  asset = (p) => (/^(https?:|data:|\/)/.test(p) ? p : `${assetBase}/${p}`);
  if (fontsCss) {
    const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: fontsCss });
    await new Promise((ok, fail) => { link.onload = ok; link.onerror = () => fail(new Error(`Could not load ${fontsCss}`)); document.head.append(link); });
  }
  const [w, h] = size;
  const root = document.documentElement;
  root.style.setProperty('--w', `${w}px`);
  root.style.setProperty('--h', `${h}px`);
  for (const [k, v] of Object.entries(brand.tokens || {})) root.style.setProperty(`--${k}`, v);
  document.body.className = h / w > 1.6 ? 'fmt-story' : '';

  const layout = LAYOUTS[slide.layout];
  if (!layout) throw new Error(`Unknown layout: ${slide.layout}. Available: ${Object.keys(LAYOUTS).join(', ')}`);

  const frame = document.getElementById('frame');
  const ink = slide.ink ?? (slide.layout === 'cta' || slide.layout === 'statement');
  frame.className = `frame l-${slide.layout} ${ink ? 'ink' : ''}`;
  frame.innerHTML = `<div class="grow stack" style="gap:0">${layout(slide, brand)}</div>${footer(brand, index, total, ink)}`;

  await document.fonts.ready;
  await Promise.all([...document.images].map((img) => img.decode().catch(() => {
    throw new Error(`Could not load image ${img.getAttribute('src')}`);
  })));
  window.__STILL_READY__ = true;
}

if (window.__STILL__) {
  render(window.__STILL__).catch((err) => {
    window.__STILL_ERROR__ = String(err?.message || err);
    console.error(err);
  });
}
