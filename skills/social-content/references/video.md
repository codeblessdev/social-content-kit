# Escribir un video

`sck video new` copia el template a `projects/<proyecto>/<pieza>/`. Es un proyecto [HyperFrames](https://github.com/heygen-com/hyperframes):
HTML + CSS + GSAP que se renderiza a MP4 cuadro por cuadro.

## Estructura

```html
<div id="root" data-composition-id="main" …>          <!-- sck timing escribe data-duration -->
  <section class="scene clip" data-scene="hook" …>     <!-- una por escena del plan; sck escribe data-start/duration -->
  …
  <!-- sck:voice --> … <!-- /sck:voice -->             <!-- audios de la voz: los escribe sck voice -->
  <div id="captions"></div>                             <!-- subtítulos: los llena SCK.captions(tl) -->
</div>
```

- `assets/brand/`: tokens (`brand.css`), fuentes y todos los assets de la marca (`photos/`, `screens/`, `refs/`, `logos/`). No editar: `sck video sync` lo regenera.
- `kit.css`: clases base (`.scene`, `.scene.ink`, `.display`, `.kicker`, `.lead`, `.card`, `.pill`, `.brandline`, `.screen`).
- Estilos propios del video: en el `<style>` del `index.html`.

## Animación

```js
const tl = gsap.timeline({ paused: true });
const t = SCK.at("hook");                              // inicio de la escena (leído del HTML)
SCK.title("#hook h1", "¿Seguís usando *esto?*");       // titular con palabras animables
tl.fromTo("#hook h1 .w", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" }, t + 0.2);
SCK.fades(tl);      // fundido de entrada entre escenas
SCK.captions(tl);   // subtítulos
// Siempre al final, escrito literalmente así (el linter de HyperFrames lo busca):
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
tl.seek(0);
```

- Posicioná todo en tiempo absoluto con `SCK.at(id) + offset` (nunca a mano en segundos fijos): así los tiempos se ajustan solos cuando cambia la voz.
- Contadores: tween sobre un objeto con `onUpdate` que pinta el texto (`SCK.thousands(n)` para separar miles).
- Determinismo: nada de `Date.now()`, `Math.random()`, `fetch`, `setTimeout` ni videos o GIF sin control. Todo lo animado, en el timeline.
- Zoom lento sobre una imagen ("Ken Burns"): `tl.fromTo(img, { scale: 1 }, { scale: 1.12, duration: SCK.dur(id), ease: "none" }, SCK.at(id))`.
- Tapar datos: un `<div>` con `backdrop-filter: blur(14px)` posicionado sobre la zona de la imagen.
- Subtítulos: abajo, sobre la zona segura. Si tapan algo importante en una escena, subilos con `--captions-lift` en esa escena
  o mové el contenido. Estilo: `--caption-bg`, `--caption-fg`, `--caption-size`.

## Ciclo

`sck voice` (o `sck timing`) → `sck check` → `sck snapshot` → mirar → corregir → `sck render --draft` → aprobar → `sck render`.

Para previsualizar en el navegador con timeline: `npx hyperframes preview <carpeta-del-video>`.
