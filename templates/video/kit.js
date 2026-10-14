// Helpers for writing scenes. Everything is deterministic (no Date.now, Math.random or fetch).
//
//   const tl = gsap.timeline({ paused: true });
//   const t = SCK.at("hook");            // second at which the "hook" scene starts
//   SCK.title("#hook h1", "Still doing it *like this?*");
//   tl.fromTo("#hook h1 .w", { opacity: 0, y: 60 }, { opacity: 1, y: 0, stagger: 0.08 }, t + 0.2);
//   SCK.captions(tl);                    // captions from assets/voice/captions.js
//   SCK.fades(tl);                       // short fade-in on every scene
//   window.__timelines = window.__timelines || {}; window.__timelines["main"] = tl; tl.seek(0);

(function () {
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // Headline with animatable words: *punchline* in italics, \n line break.
  function words(text) {
    return String(text ?? '')
      .split('\n')
      .map((line) =>
        line
          .split(/(\*[^*]+\*)/)
          .filter(Boolean)
          .map((chunk) => {
            const em = chunk.startsWith('*') && chunk.endsWith('*');
            const inner = (em ? chunk.slice(1, -1) : chunk).trim().split(/\s+/).filter(Boolean)
              .map((w) => `<span class="w">${esc(w)}</span>`).join(' ');
            return em ? `<em>${inner}</em>` : inner;
          })
          .join(' '),
      )
      .join('<br>');
  }

  // Thousands separator for the video's language (<html lang>), without depending on the browser's locale data.
  const SEPARATORS = { es: '.', pt: '.', it: '.', de: '.', nl: '.', fr: ' ' };
  const defaultSep = () => SEPARATORS[(document.documentElement.lang || 'en').split('-')[0].toLowerCase()] ?? ',';

  const scene = (id) => document.querySelector(`[data-scene="${id}"]`);

  window.SCK = {
    esc,
    words,
    title(selector, text) {
      document.querySelectorAll(selector).forEach((el) => (el.innerHTML = words(text)));
    },
    // 1250000 -> "1,250,000" (en) · "1.250.000" (es) · pass a separator to override
    thousands: (n, sep = defaultSep()) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, sep),
    lang: () => document.documentElement.lang || 'en',
    at: (id) => Number(scene(id)?.dataset.start ?? 0),
    dur: (id) => Number(scene(id)?.dataset.duration ?? 0),

    // Short fade-in on every scene except the first.
    fades(tl, d = 0.3) {
      document.querySelectorAll('[data-scene]').forEach((el, i) => {
        if (i > 0) tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: d }, Number(el.dataset.start));
      });
    },

    // Captions: one span per phrase, visible between start and end.
    captions(tl) {
      const box = document.getElementById('captions');
      const list = window.__SCK_CAPTIONS__ || [];
      if (!box || !list.length) return;
      box.innerHTML = list.map((c) => `<span class="cap">${esc(c.text)}</span>`).join('');
      box.querySelectorAll('.cap').forEach((el, i) => {
        tl.set(el, { opacity: 1 }, list[i].start);
        tl.set(el, { opacity: 0 }, list[i].end);
      });
    },
  };
})();
