---
name: social-content
description: Genera contenido para redes (imágenes, carruseles, reels y videos con voz en off y subtítulos) con la línea visual de una app, a partir de su repo (link o carpeta local). Usar cuando pidan posts, reels, videos, carruseles o contenido para Instagram, YouTube, TikTok, LinkedIn u otra red sobre una app o producto.
---

# Contenido para redes

Producís piezas listas para revisar y publicar: imágenes, carruseles y videos (HyperFrames) con voz en off local (Kokoro) y subtítulos.
Todo pasa por el CLI `sck` de este kit. **Nunca publicás ni programás nada en una red social**: la persona revisa y sube.

## 0. Antes de empezar

1. Corré `sck doctor`. Si `sck` no existe, seguí "Instalación" del README del kit y volvé.
2. Workspace: si la persona no dijo otro, usá `./social-content` (o `$SCK_WORKSPACE`). Pasalo como `--workspace <dir>` a todos los comandos si no es el actual.
3. Corré `sck brands` para saber qué apps ya tienen marca cargada.

## 1. Preguntas iniciales (siempre, las cuatro juntas)

Hacelas en un solo mensaje. Si tu entorno tiene una herramienta para preguntas con opciones, usala; si no, numeradas en texto.
Cada pregunta acepta "otra" con texto libre. Si la persona ya respondió alguna en su pedido, no la repitas: confirmala en el resumen.

1. **¿De qué app?** Las marcas de `sck brands` y "Otra: pasame el link del repo (GitHub, GitLab…) o la carpeta en tu compu".
2. **¿Qué tipo de contenido?** Imagen · Carrusel · Reel/video corto · Video horizontal · Otro.
3. **¿Para qué plataforma?** Instagram · YouTube · TikTok · LinkedIn · Otra.
4. **¿Objetivo?** Marketing/venta · Generar vistas/alcance · Meme · Tutorial de un módulo · Otro.

## 2. Marca

- **App nueva**: `sck brand init <link|carpeta> --id <id>`. Después leé `brands/<id>/scan.json` y el código de la landing o
  la home pública (`landing_candidates`) y completá `brand.json` siguiendo [references/brand.md](references/brand.md).
  Mostrale a la persona un resumen (paleta, fuentes, 3 frases de ejemplo en su voz, hechos del producto) y **esperá su OK**
  antes de marcar `"status": "confirmed"`.
- **App existente**: usá su `brand.json` tal cual. Si está en `draft`, completalo primero.
- Si el link es privado y `git` no puede clonar, pedile a la persona que lo clone y te pase la carpeta.

## 3. Preguntas de seguimiento (solo las que apliquen)

- **Material de la app** (video, tutorial o cualquier pieza que muestre pantallas): pedí capturas de las pantallas que hacen falta,
  diciendo cuáles y para qué. Guardalas en `brands/<id>/assets/screens/` (o en la carpeta del proyecto si son de un solo uso).
  Si no tiene, ofrecé **reconstruir las pantallas desde el código** (HTML/CSS de la app con datos de ejemplo). Ver [references/screens.md](references/screens.md).
- **Voz en off**: ¿sí o no? Voz `ef_dora` (mujer), `em_alex` o `em_santa` (hombre); velocidad. Requiere `sck setup voice` una vez.
- **Subtítulos**: por defecto sí si hay voz (la mayoría mira sin sonido).
- **Duración**, **CTA** y cualquier material propio (logo, fotos, música).

## 4. Plan → esperar confirmación

1. `sck project new "<nombre>" --brand <id> --platform <plataforma> --goal <objetivo>` crea `projects/<fecha>-<nombre>/plan.json`.
2. Completá `plan.json` según [references/plan.md](references/plan.md) y [references/goals.md](references/goals.md); formatos en [references/platforms.md](references/platforms.md).
3. Mostrá el plan legible: por pieza, formato y tamaño; en videos, tabla de escenas con *tiempo estimado · qué se ve ·
   texto en pantalla · locución*; caption y hashtags; qué material falta.
4. **No produzcas nada hasta que la persona apruebe el plan.** Si pide cambios, actualizá `plan.json` y volvé a mostrarlo.

## 5. Producción

**Imágenes y carruseles**: `sck render <proyecto> --only <pieza>`. Si aparece `⚠ no entra en el cuadro`, acortá el texto.

**Videos** (ver [references/video.md](references/video.md)):
1. `sck video new <proyecto> <pieza>` crea un proyecto HyperFrames en `projects/<proyecto>/<pieza>/`.
2. Escribí las escenas en su `index.html`: un elemento `data-scene="<id>"` por escena del plan, con las ayudas de `kit.js`.
3. `sck voice <proyecto> <pieza>` (o `sck timing …` sin voz) calcula la duración de cada escena según su locución,
   genera los subtítulos y escribe los tiempos en el HTML. Volvé a correrlo cada vez que cambie la locución o las escenas.
4. `sck check <proyecto> <pieza>` y arreglá los errores.
5. `sck snapshot <proyecto> <pieza>` y **mirá las imágenes**: texto cortado, subtítulos que tapan algo, escenas vacías, contraste.
6. `sck render <proyecto> --only <pieza> --draft` para revisar, y sin `--draft` cuando esté aprobado.

## 6. Entrega

Pasá la ruta de `projects/<proyecto>/out/index.html` (todas las piezas con su caption), un resumen de lo que hiciste y los
supuestos que tomaste (números de demo, pantallas reconstruidas, voz elegida). Ofrecé ajustes; no publiques.

## Reglas

- El copy sale de `brand.json` (`voice`, `facts`). No inventes funciones, precios ni métricas. Números reales solo si la persona los da
  o vienen de una fuente que ella indicó; si no, usá `demo_numbers` y que no se presenten como reales.
- Nunca muestres datos reales de clientes ni datos personales. En capturas de la persona, tapá nombres, mails, teléfonos o CUITs que aparezcan.
- Ragebait y humor sí, pero contra *la situación* (el sistema viejo, la planilla), no contra una marca competidora con nombre.
  Si una captura muestra el nombre o logo de otro software, difuminalo.
- Respetá la zona segura de cada plataforma (la escribe `sck` como `--safe-top` y `--safe-bottom`).
