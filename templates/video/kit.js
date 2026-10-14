// Ayudas para escribir escenas. Todo es determinista (sin Date.now, Math.random ni fetch).
//
//   const tl = gsap.timeline({ paused: true });
//   const t = SCK.at("hook");            // segundo en que empieza la escena "hook"
//   SCK.title("#hook h1", "¿Seguís *usando esto?*");
//   tl.fromTo("#hook h1 .w", { opacity: 0, y: 60 }, { opacity: 1, y: 0, stagger: 0.08 }, t + 0.2);
//   SCK.captions(tl);                    // subtítulos desde assets/voice/captions.js
//   SCK.fades(tl);                       // fundido de entrada en cada escena
//   window.__timelines = window.__timelines || {}; window.__timelines["main"] = tl; tl.seek(0);

(function () {
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // Titular con palabras animables: *remate* en itálica, \n salto de línea.
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

  const scene = (id) => document.querySelector(`[data-scene="${id}"]`);

  window.SCK = {
    esc,
    words,
    title(selector, text) {
      document.querySelectorAll(selector).forEach((el) => (el.innerHTML = words(text)));
    },
    // 1250000 -> 1.250.000 sin depender del locale del navegador
    thousands: (n, sep = '.') => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, sep),
    at: (id) => Number(scene(id)?.dataset.start ?? 0),
    dur: (id) => Number(scene(id)?.dataset.duration ?? 0),

    // Fundido corto de entrada en cada escena (salvo la primera).
    fades(tl, d = 0.3) {
      document.querySelectorAll('[data-scene]').forEach((el, i) => {
        if (i > 0) tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: d }, Number(el.dataset.start));
      });
    },

    // Subtítulos: un span por frase, visible entre start y end.
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
