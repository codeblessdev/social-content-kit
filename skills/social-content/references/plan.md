# plan.json

```jsonc
{
  "brand": "mi-app",                // id en brands/
  "platform": "instagram",          // ver platforms.md
  "goal": "marketing",              // marketing | vistas | meme | tutorial | otro
  "title": "Lanzamiento de turnos online",
  "status": "draft",                // "approved" cuando la persona aprueba
  "pieces": [
    {
      "id": "post-problema",        // [a-z0-9-]
      "type": "image",              // image | carousel | video
      "format": "post",
      "slide": { "layout": "photo", "kicker": "El problema", "title": "Los turnos por WhatsApp *se pierden.*", "photo": "photos/agenda.jpg" },
      "caption": "…",
      "hashtags": ["turnosonline"]
    },
    {
      "id": "carrusel-pasos",
      "type": "carousel",
      "format": "carousel",
      "slides": [ { "layout": "cover", "title": "…" }, { "layout": "step", "n": "01", "title": "…", "text": "…" }, { "layout": "cta", "title": "…" } ]
    },
    {
      "id": "reel-presentacion",
      "type": "video",
      "format": "reel",
      "voice": { "engine": "kokoro", "voice": "em_alex", "speed": 1.0 },   // o null sin voz
      "captions": true,
      "scenes": [
        { "id": "hook", "visual": "Captura de un chat lleno de pedidos de turno", "onscreen": "¿Seguís dando turnos así?", "voice": "¿Seguís dando turnos por chat?", "min": 3 },
        { "id": "cta", "visual": "Fondo oscuro, logo y CTA", "onscreen": "14 días gratis", "voice": "Probalo gratis.", "min": 3 }
      ],
      "caption": "…",
      "hashtags": []
    }
  ]
}
```

## Textos

- `*asteriscos*`: el remate del titular en itálica (fuente display). `\n`: salto de línea forzado; usalo cuando el corte natural deja una palabra suelta.
- Títulos de hasta ~8 palabras; `text` de hasta ~14.

## Slides (`layout`)

| layout | campos |
|---|---|
| `cover` | kicker, title, text. Primera slide del carrusel |
| `statement` | kicker, title, text. Fondo oscuro |
| `photo` | kicker, title, `photo`, caption |
| `screen` | kicker, title, `photo` (captura de la app, se muestra entera con marco) |
| `split` | kicker, title, text, `photo` (mejor vertical) |
| `stat` | kicker, title, `widget`: { label, value, note, delta, kind: `bars` \| `ranks` \| `locs`, data } |
| `step` | `n`, title, text |
| `list` | kicker, title, `items`: [{ title, text }] (hasta 4) |
| `plans` | kicker, title, `plans` (por defecto, `facts.plans`) |
| `cta` | kicker, title, `cta` (por defecto, `facts.cta`). Última slide |

`photo` es una ruta relativa al proyecto o a `brands/<id>/assets/` (`photos/x.jpg`, `screens/y.png`, `refs/z.jpg`).
Cualquier slide acepta `"ink": true` para el fondo oscuro.

## Escenas de video

- `id`: tiene que coincidir con un `data-scene="<id>"` en el `index.html` del video.
- `voice`: lo que dice la locución en esa escena. Con voz, la escena dura lo que dure su locución más ~0,5 s (o `min`, lo que sea mayor).
- Sin voz: `duration` en segundos.
- `visual` y `onscreen` son para la persona que revisa el plan y para vos al escribir la escena.
- Ritmo de locución: Kokoro lee ~2,5 palabras por segundo. Una escena de 3 s admite ~7 palabras.
