# plan.json

```jsonc
{
  "brand": "my-app",                // id in brands/
  "platform": "instagram",          // see platforms.md
  "language": "en",                 // voice-over, captions, on-screen text, UI words, <html lang> (BCP 47)
  "ui_language": "es",              // optional: text inside screens rebuilt from the app's HTML (default: the app's own language)
  "goal": "marketing",              // marketing | reach | meme | tutorial | other
  "title": "Online bookings launch",
  "status": "draft",                // "approved" once the person approves it
  "pieces": [
    {
      "id": "post-problem",         // [a-z0-9-]
      "type": "image",              // image | carousel | video
      "format": "post",
      "slide": { "layout": "photo", "kicker": "The problem", "title": "Bookings over chat *get lost.*", "photo": "photos/desk.jpg" },
      "caption": "…",
      "hashtags": ["onlinebooking"]
    },
    {
      "id": "carousel-steps",
      "type": "carousel",
      "format": "carousel",
      "slides": [ { "layout": "cover", "title": "…" }, { "layout": "step", "n": "01", "title": "…", "text": "…" }, { "layout": "cta", "title": "…" } ]
    },
    {
      "id": "launch-reel",
      "type": "video",
      "format": "reel",
      "voice": { "engine": "kokoro", "gender": "female", "speed": 1.0 },   // or { "voice": "am_michael" }, or null for no voice-over
      "captions": true,
      "scenes": [
        { "id": "hook", "visual": "Phone full of booking messages", "onscreen": "Still booking like this?", "voice": "Still taking bookings over chat?", "min": 3 },
        { "id": "cta", "visual": "Dark background, logo and CTA", "onscreen": "Start free", "voice": "Try it free today.", "min": 3 }
      ],
      "caption": "…",
      "hashtags": []
    }
  ]
}
```

## Language

- `language` is required. Everything you write (titles, texts, narration, captions, hashtags, post caption) goes in that language.
- Voice: without an explicit `voice.voice`, `sck` uses the default voice for `language` (`gender`: `female` | `male`) and its
  pronunciation. `sck languages` lists them. For other languages set `"voice": { "voice": "<kokoro id>", "lang": "<phonemizer>" }`.
- `ui_language` only matters for screens rebuilt from code (see screens.md). Real screenshots stay as they are.

## Text

- `*asterisks*`: the headline's punchline in italics (display font). `\n`: forced line break; use it when the natural break leaves a single word on its own.
- Titles up to ~8 words; `text` up to ~14.

## Slides (`layout`)

| layout | fields |
|---|---|
| `cover` | kicker, title, text. First slide of a carousel |
| `statement` | kicker, title, text. Dark background |
| `photo` | kicker, title, `photo`, caption |
| `screen` | kicker, title, `photo` (an app screenshot, shown whole with a frame) |
| `split` | kicker, title, text, `photo` (best with portrait photos) |
| `stat` | kicker, title, `widget`: { label, value, note, delta, kind: `bars` \| `ranks` \| `locs`, data } |
| `step` | `n`, title, text |
| `list` | kicker, title, `items`: [{ title, text }] (up to 4) |
| `plans` | kicker, title, `plans` (defaults to `facts.plans`) |
| `cta` | kicker, title, `cta` (defaults to `facts.cta`). Last slide |

`photo` is a path relative to the project or to `brands/<id>/assets/` (`photos/x.jpg`, `screens/y.png`, `refs/z.jpg`).
Any slide accepts `"ink": true` for a dark background.

## Video scenes

- `id`: must match a `data-scene="<id>"` element in the video's `index.html`.
- `voice`: what the narration says in that scene. With voice-over, the scene lasts as long as its narration plus ~0.5 s (or `min`, whichever is longer).
- Without voice-over: `duration` in seconds.
- `visual` and `onscreen` are for the person reviewing the plan and for you when writing the scene.
- Narration pace: Kokoro reads ~2.5 words per second in English and Spanish. A 3 s scene fits ~7 words.
