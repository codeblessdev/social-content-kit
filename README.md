# social-content-kit

**Turn any app's codebase into on-brand social content** — images, carousels, reels and videos with AI voice-over and synced captions — driven by the AI coding agent you already use.

Point it at a GitHub link or a folder on your machine. It reads the app's code to extract the brand (colors, fonts, logo, tone of voice, product facts), asks you a few questions, proposes a scene-by-scene plan, and only after you approve it renders the content locally.

Works with **Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode** and any agent that supports [Agent Skills](https://agentskills.io) or reads `AGENTS.md` — or by hand with the `sck` CLI.

```
You:    "Make an Instagram reel for the app in ~/projects/my-app"
Agent:  asks: which app · content type · platform · goal
        → scans the app's code and shows you the brand it found (palette, fonts, voice) for confirmation
        → asks for screenshots (or rebuilds the screens from the app's HTML/CSS)
        → asks about voice-over and captions
        → shows a scene-by-scene plan and WAITS for your approval
        → generates the voice, captions and video, reviews key frames, fixes issues
        → hands you a review page with every piece and its caption
You:    review, tweak, publish
```

**It never publishes anything.** You review and post.

---

## Contents

- [Features](#features)
- [How it works](#how-it-works)
- [Requirements](#requirements)
- [Installation](#installation)
- [Connect it to your agent](#connect-it-to-your-agent)
- [Using it with an agent](#using-it-with-an-agent)
- [Using the CLI directly](#using-the-cli-directly)
- [Workspace layout](#workspace-layout)
- [brand.json](#brandjson)
- [plan.json](#planjson)
- [Platforms and formats](#platforms-and-formats)
- [Voice-over and captions](#voice-over-and-captions)
- [Writing video scenes](#writing-video-scenes)
- [What runs locally and what goes online](#what-runs-locally-and-what-goes-online)
- [Troubleshooting](#troubleshooting)
- [Limitations](#limitations)
- [Contributing](#contributing)
- [License and credits](#license-and-credits)

---

## Features

- **Brand from code.** `sck brand init` scans CSS/SCSS/HTML/JSX/Vue/Svelte/Astro files for colors (by frequency), CSS custom properties, font families, Google Fonts links, logos, images, page titles and the README, then downloads the fonts. Your agent curates the draft using the public landing page and confirms it with you.
- **Any repo or folder.** Accepts a local path, any git URL (`https://…`, `git@…`) or a GitHub `owner/repo`. Not tied to GitHub or to any framework.
- **Images and carousels.** Ten layouts (cover, statement, photo, screenshot, split, stat with chart, step, list, pricing plans, CTA) rendered with headless Chrome at the right size for each platform.
- **Videos.** Built with [HyperFrames](https://github.com/heygen-com/hyperframes) (HTML + CSS + GSAP → deterministic MP4). The kit adds scene timing, captions, per-platform safe areas and animation helpers; the agent writes each video's scenes.
- **Free local voice-over.** [Kokoro-82M](https://github.com/thewh1teagle/kokoro-onnx) runs on your machine — 54 voices in English, Spanish, French, Italian, Portuguese, Hindi, Japanese and Chinese. No API keys.
- **Captions that stay in sync without transcription.** Each scene's narration is synthesized separately, so every line's duration is known exactly. Scenes are as long as their narration, and captions are timed inside each take.
- **App screens: real or rebuilt.** Use your own screenshots, or let the agent rebuild a screen in HTML from the app's components (with demo data), so it can be animated: typing into a login form, a counter going up, rows sliding in.
- **Plan first, render later.** The skill always asks four questions, writes a plan, and waits for your approval before producing anything.
- **Review page.** Every render ends in `out/index.html` with all pieces and ready-to-paste captions and hashtags.

## How it works

```
                 ┌─────────────────────────────────────────────┐
  your app ────▶ │ sck brand init   → brands/<id>/brand.json   │  colors, fonts, logo, voice, facts
 (repo/folder)   └─────────────────────────────────────────────┘
                                     │  agent curates + you confirm
                                     ▼
                 ┌─────────────────────────────────────────────┐
  your answers ▶ │ plan.json        → you approve              │  pieces, slides, scenes, narration
                 └─────────────────────────────────────────────┘
                     │                               │
          images / carousels                       videos
                     ▼                               ▼
     templates/still + headless Chrome     sck video new → agent writes scenes (HTML/GSAP)
                     │                     sck voice     → Kokoro TTS per scene → timing + captions
                     │                     sck check / snapshot → agent reviews frames
                     │                     HyperFrames render (Chrome + FFmpeg) → MP4
                     ▼                               ▼
                 ┌─────────────────────────────────────────────┐
                 │ projects/<project>/out/index.html  (review) │
                 └─────────────────────────────────────────────┘
```

## Requirements

| | Required for | Notes |
|---|---|---|
| **Node.js 22+** | everything | |
| **Google Chrome** (or Chromium) | images, videos | Set `CHROME_PATH` if it's not in a standard location |
| **git** | repo links | Only when you pass a URL instead of a folder |
| **FFmpeg** | videos, voice | `sudo apt install ffmpeg` · `brew install ffmpeg` · [ffmpeg.org](https://ffmpeg.org/download.html) |
| **Python 3 with venv** | voice-over | Debian/Ubuntu: `sudo apt install python3-venv` |
| Docker | optional | Deterministic renders with `--docker`; also used automatically when FFmpeg is missing |

Run `sck doctor` at any time to see what's installed and what's missing.

## Installation

```bash
git clone https://github.com/codeblessdev/social-content-kit.git ~/social-content-kit
cd ~/social-content-kit
npm install
npm link            # makes the `sck` command available everywhere
sck doctor          # checks your setup
sck setup voice     # optional: installs Kokoro in ~/.cache/social-content-kit/venv
```

To update later: `cd ~/social-content-kit && git pull && npm install`.

## Connect it to your agent

**Agents that support Agent Skills** (Claude Code, Codex, Cursor, Gemini CLI, Copilot, OpenCode…):

```bash
npx skills add codeblessdev/social-content-kit
```

**Manual install:** copy or symlink `skills/social-content/` into your agent's skills folder, for example:

```bash
ln -s ~/social-content-kit/skills/social-content ~/.claude/skills/social-content
```

**Agents without skill support:** open the agent inside this repo (it reads `AGENTS.md`), or tell it:
*"Follow ~/social-content-kit/skills/social-content/SKILL.md"*.

## Using it with an agent

Just ask:

- *"Make an Instagram reel presenting the app at https://github.com/acme/booking-app"*
- *"I need a LinkedIn carousel about the reports module of ~/code/dashboard"*
- *"A YouTube Short tutorial on how to export invoices in our billing app"*
- *"Make a meme for TikTok about doing inventory in spreadsheets"*

The skill then follows this flow:

1. **Four questions, always, in one message:** which app (an existing brand, a repo link or a folder) · content type (image, carousel, short video, landscape video, other) · platform (Instagram, YouTube, TikTok, LinkedIn, other) · goal (marketing/sales, reach/views, meme, module tutorial, other).
2. **Brand.** For a new app it runs `sck brand init`, completes `brand.json` from the landing page and the code, and shows you the palette, fonts, sample sentences in the brand's voice and product facts for confirmation.
3. **Follow-ups, only if relevant:** screenshots of specific screens (or an offer to rebuild them from code), voice-over and voice choice, captions, length, CTA.
4. **The plan.** Each piece with its format; for videos, a table of scenes with *time · what's on screen · on-screen text · narration*; caption and hashtags. **Nothing is produced until you approve.**
5. **Production.** Renders, checks, snapshots key frames, looks at them and fixes problems (cut-off text, captions covering content, empty scenes).
6. **Delivery.** The path to the review page, a summary and any assumptions it made (demo numbers, rebuilt screens…).

Guardrails built into the skill: copy only uses facts from the app's code or from you (no invented features, prices or metrics); real customer data and personal data never appear; humor and ragebait target *the situation* (the old system, the spreadsheet), never a named competitor; third-party logos in screenshots get blurred.

## Using the CLI directly

Everything the agent does goes through `sck`, so you can drive it yourself:

```bash
export SCK_WORKSPACE=~/social-content          # where brands, projects and outputs live

# 1. Brand
sck brand init https://github.com/acme/booking-app --id booking
#    → edit ~/social-content/brands/booking/brand.json (see below), set "status": "confirmed"

# 2. Project + plan
sck project new "launch reel" --brand booking --platform instagram --goal marketing
#    → edit projects/<date>-launch-reel/plan.json (see below)

# 3a. Images / carousels
sck render <date>-launch-reel --only my-carousel

# 3b. Videos
sck video new <date>-launch-reel my-reel        # creates a HyperFrames project for the piece
#    → write the scenes in projects/<date>-launch-reel/my-reel/index.html
sck voice <date>-launch-reel my-reel            # TTS per scene → timing + captions written into the HTML
sck check <date>-launch-reel my-reel            # lint, runtime, layout, contrast
sck snapshot <date>-launch-reel my-reel         # PNG frames to review
sck render <date>-launch-reel --only my-reel --draft
sck render <date>-launch-reel                   # final render of everything + review page
```

All commands:

```
sck doctor                                   what's installed and what's missing
sck setup voice                              install Kokoro (local voice)
sck brands                                   list brands in the workspace
sck brand init <url|owner/repo|folder> [--id x] [--force]
sck brand fonts <id>                         re-download the brand's Google Fonts
sck project new <name> --brand <id> --platform <p> [--goal <g>]
sck video new <project> <piece> [--force]    create the HyperFrames project for a video piece
sck video sync <project> <piece>             re-copy brand assets into the video
sck voice <project> <piece>                  generate voice-over, apply timing and captions
sck timing <project> <piece>                 recompute timing and captions without re-generating voice
sck check <project> <piece>                  validate the composition
sck snapshot <project> <piece> [--at 1,4.5]  key frames as PNG (default: each scene)
sck render <project> [--only <piece>] [--draft] [--docker|--local]

Global: --workspace <dir>  (or $SCK_WORKSPACE; default ./social-content)
```

`<project>` is a folder name under `projects/` or a path to a folder containing `plan.json`.

## Workspace layout

The kit never stores anything about your apps. Everything lives in a workspace (`./social-content` by default):

```
social-content/
  brands/<app>/
    brand.json         tokens, fonts, voice, facts (curated, confirmed)
    scan.json          raw scan results
    fonts.css, fonts/  downloaded web fonts
    assets/
      logos/ photos/   copied from the app's repo
      screens/         your screenshots of the app
      refs/            anything else you want to use (e.g. a competitor-style "old system" photo)
  projects/<date>-<name>/
    plan.json          what gets produced (approved before rendering)
    <video-piece>/     HyperFrames project for each video
    out/               PNG, MP4, caption.txt per piece + index.html to review
  .sources/            repos cloned from links
```

Teams can version the workspace in its own (private) repo to share brands and projects.

## brand.json

```jsonc
{
  "id": "booking",
  "name": "Booking",
  "status": "confirmed",            // "draft" until a human confirms it
  "handle": "@acme",
  "tokens": {
    "bg": "#f6f2ea", "surface": "#fffcf7", "ink": "#1c1a17", "ink-soft": "#5b554c", "muted": "#6f695f",
    "line": "rgba(28, 26, 23, 0.08)", "on-ink": "#f6f2ea", "accent": "#d0643b", "positive": "#2f6b4f",
    "font-display": "'Instrument Serif', Georgia, serif", "font-body": "Inter, system-ui, sans-serif", "radius": "28px"
  },
  "fonts": { "google": ["https://fonts.googleapis.com/css2?family=…"], "css": "fonts.css" },
  "logo": "logos/logo.svg",
  "voice": {
    "language": "en-US, friendly and direct",
    "rules": ["Short sentences.", "No exclamation marks.", "Headlines in two beats; the punchline in *italics*."],
    "examples": ["Every booking, *in one place.*"]
  },
  "facts": {
    "pitch": "…", "problem": "…",
    "steps": [{ "title": "…", "text": "…" }],
    "features": [{ "title": "…", "text": "…", "photo": "photos/x.jpg" }],
    "plans": [{ "name": "Pro", "price": "$10", "note": "per month", "featured": true }],
    "trial": "14-day free trial", "cta": "Start free"
  },
  "photos": { "photos/x.jpg": "One-line description, vertical/horizontal" },
  "demo_numbers": { "note": "Illustrative numbers from the landing page" }
}
```

| token | used for |
|---|---|
| `bg` | page background |
| `surface` | cards |
| `ink` | main text and the background of dark scenes |
| `ink-soft` | secondary text |
| `muted` | kickers, notes, footer |
| `line` | subtle borders |
| `on-ink` | text on `ink` |
| `accent` | brand highlight (step numbers, highlighted bar) |
| `positive` | positive deltas / second color |
| `font-display`, `font-body` | headings and body text, with fallbacks |
| `radius` | card corner radius |

Tip: take colors from the app's **public face** (landing, home, login), not its internal dashboard — dashboards often use framework defaults that aren't the brand.

## plan.json

```jsonc
{
  "brand": "booking",
  "platform": "instagram",
  "goal": "marketing",
  "title": "Online bookings launch",
  "pieces": [
    {
      "id": "post-problem", "type": "image", "format": "post",
      "slide": { "layout": "photo", "kicker": "The problem", "title": "Bookings over chat *get lost.*", "photo": "photos/desk.jpg" },
      "caption": "…", "hashtags": ["onlinebooking"]
    },
    {
      "id": "carousel-steps", "type": "carousel", "format": "carousel",
      "slides": [
        { "layout": "cover", "title": "Three steps.\n*From signup to first booking.*" },
        { "layout": "step", "n": "01", "title": "Set up *your services.*", "text": "…" },
        { "layout": "cta", "title": "Try it *free.*" }
      ]
    },
    {
      "id": "launch-reel", "type": "video", "format": "reel",
      "voice": { "engine": "kokoro", "voice": "af_heart", "speed": 1.0 },
      "captions": true,
      "scenes": [
        { "id": "hook", "visual": "Phone full of booking messages", "onscreen": "Still booking like this?", "voice": "Still taking bookings over chat?", "min": 3 },
        { "id": "cta", "visual": "Dark background, logo and CTA", "onscreen": "Start free", "voice": "Try it free today.", "min": 3 }
      ],
      "caption": "…", "hashtags": []
    }
  ]
}
```

**Text conventions:** `*asterisks*` mark the punchline (italic display font); `\n` forces a line break.

**Slide layouts**

| layout | fields |
|---|---|
| `cover` | kicker, title, text — first slide of a carousel |
| `statement` | kicker, title, text — dark background |
| `photo` | kicker, title, `photo`, caption |
| `screen` | kicker, title, `photo` — an app screenshot shown whole, framed |
| `split` | kicker, title, text, `photo` (works best with portrait photos) |
| `stat` | kicker, title, `widget`: `{ label, value, note, delta, kind: "bars" \| "ranks" \| "locs", data }` |
| `step` | `n`, title, text |
| `list` | kicker, title, `items: [{ title, text }]` (up to 4) |
| `plans` | kicker, title, `plans` (defaults to `facts.plans`) |
| `cta` | kicker, title, `cta` (defaults to `facts.cta`) — last slide |

Any slide accepts `"ink": true` for a dark background. `photo` paths resolve against the project folder first, then `brands/<id>/assets/`.

**Video scenes:** each `id` must match a `data-scene="<id>"` element in the video's `index.html`. With narration, a scene lasts as long as its `voice` line plus ~0.5 s (or `min`, whichever is longer); without narration, use `duration`. Kokoro reads about 2.5 words per second.

## Platforms and formats

| platform | `format` | size | notes |
|---|---|---|---|
| instagram | `post`, `carousel` | 1080×1350 | |
| instagram | `square` | 1080×1080 | |
| instagram | `reel`, `story` | 1080×1920 | safe area: 220 px top, 420 px bottom (reel) |
| youtube | `short` | 1080×1920 | |
| youtube | `video` | 1920×1080 | |
| youtube | `thumbnail` | 1280×720 | |
| tiktok | `video`, `carousel` | 1080×1920 | safe area: 480 px bottom |
| linkedin | `post`, `carousel` | 1080×1350 | |
| linkedin | `square` / `video` | 1080×1080 / 1080×1920 | |
| x | `post` / `video` | 1600×900 / 1920×1080 | |
| facebook | `post` / `story`, `reel` | 1080×1350 / 1080×1920 | |

Any piece can override its size with `"size": [width, height]`.

## Voice-over and captions

- **Engine:** Kokoro-82M via `kokoro-onnx`, run through HyperFrames' `tts` command in a private Python venv (`sck setup voice`). Free and offline after the first model download.
- **Voices:** set `"voice"` in the piece. Common ones: `af_heart`, `af_nova`, `af_sky`, `am_adam`, `am_michael` (US English) · `bf_emma`, `bf_isabella`, `bm_george` (UK English) · `ef_dora`, `em_alex`, `em_santa` (Spanish) · `ff_siwis` (French) · `jf_alpha` (Japanese) · `zf_xiaobei` (Chinese). Any of the [54 Kokoro voices](https://github.com/thewh1teagle/kokoro-onnx) works; list them with `npx hyperframes tts --list`. `"speed"` adjusts the pace; `"lang"` overrides the phonemizer.
- **Timing:** every scene's narration is synthesized as its own take and measured with `ffprobe`. Scenes start back to back; each lasts its narration + a short pause. `sck voice` writes `data-start` / `data-duration` into the HTML and one `<audio>` clip per scene.
- **Captions:** each line is split into short phrases (≤ 3 words / 22 characters, breaking at punctuation) and spread over the take proportionally to word length. Written to `assets/voice/captions.js` and shown by `SCK.captions(tl)`. Restyle with `--caption-bg`, `--caption-fg`, `--caption-size`, `--captions-lift`.
- Voice takes are cached: only scenes whose text or voice changed are re-synthesized.

## Writing video scenes

`sck video new` copies `templates/video/` into the project. Scenes are plain HTML sections animated with GSAP on a single paused timeline:

```html
<section class="scene clip" data-scene="hook">
  <h1 class="display" id="hook-title"></h1>
</section>
<!-- sck:voice --> … <!-- /sck:voice -->   <!-- written by `sck voice` -->
<div id="captions"></div>

<script>
  SCK.title("#hook-title", "Still booking *like this?*");   // animatable words, *italic* punchline
  const tl = gsap.timeline({ paused: true });
  const t = SCK.at("hook");                                  // scene start, read from the HTML
  tl.fromTo("#hook-title .w", { opacity: 0, y: 60 }, { opacity: 1, y: 0, stagger: 0.08 }, t + 0.2);
  SCK.fades(tl);      // short fade between scenes
  SCK.captions(tl);   // captions
  window.__timelines = window.__timelines || {};
  window.__timelines["main"] = tl;                           // required by HyperFrames, written literally
  tl.seek(0);
</script>
```

Helpers in `kit.js`: `SCK.title`, `SCK.words`, `SCK.at(id)`, `SCK.dur(id)`, `SCK.thousands(n)`, `SCK.fades(tl)`, `SCK.captions(tl)`, `SCK.esc`. Base classes in `kit.css`: `.scene`, `.scene.ink`, `.display`, `.kicker`, `.lead`, `.card`, `.pill`, `.brandline`, `.screen`. Brand assets are available under `assets/brand/` (`photos/`, `screens/`, `refs/`, `logos/`).

Rules (HyperFrames renders frame by frame): position everything relative to `SCK.at(id)` so timings adapt when narration changes; no `Date.now()`, `Math.random()`, `fetch` or timers; animate counters with a tween on an object plus `onUpdate`. Preview with a timeline scrubber: `npx hyperframes preview <video-folder>`. More in [skills/social-content/references/video.md](skills/social-content/references/video.md).

## What runs locally and what goes online

**Local, free, no accounts:** HyperFrames (open source, Apache-2.0 — no HeyGen account or service is used), headless Chrome via puppeteer-core, FFmpeg, Kokoro TTS, caption timing.

**Network access:**

- **Your AI agent** writes the plan, copy and scenes. It reads the app's code and screenshots and sends them to its provider, as when you use it for coding. This is the only paid part (your existing subscription).
- **First-run downloads:** npm and Python packages, the Kokoro model, and a headless Chrome build fetched by HyperFrames.
- **During renders:** GSAP is loaded from the jsDelivr CDN; HyperFrames may fetch fallback fonts from Google Fonts.
- **Brand scan:** downloads the app's Google Fonts; clones the repo if you pass a URL.
- **HyperFrames telemetry:** anonymous usage data (no file paths or content, per its notice). Disable with `npx hyperframes telemetry disable`.

No ElevenLabs, OpenAI, HeyGen platform or other paid API is used.

## Troubleshooting

| Problem | Fix |
|---|---|
| `sck: command not found` | Run `npm link` inside the repo, or use `node ~/social-content-kit/bin/sck.mjs` |
| `No encuentro Chrome` (Chrome not found) | Install Chrome or set `CHROME_PATH=/path/to/chrome` |
| `No pude crear el entorno de Python` | `sudo apt install python3-venv` (or `python3.12-venv`), then `sck setup voice` |
| Voice fails with `kokoro-onnx is not installed` | `sck setup voice` |
| Private repo can't be cloned | Authenticate git (e.g. `gh auth login`) or clone it yourself and pass the folder |
| `⚠ … no entra en el cuadro` (doesn't fit) | Shorten that slide's text |
| Video renders slowly | Install FFmpeg for local GPU rendering; Docker mode is slower and builds an image the first time |
| `missing_timeline_registry` in `sck check` | Keep the `window.__timelines["main"] = tl` lines written literally at the end of the script |

## Limitations

- The CLI messages and the skill's instructions are written in **Spanish** (the tool was built for a Spanish-speaking team). Agents follow them fine and write content in whatever language your brand uses; translations are welcome.
- Kokoro is the only TTS engine wired in so far. The `voice.engine` field is there to add others (ElevenLabs, OpenAI, HeyGen…).
- Brand extraction is heuristic: always review `brand.json` before producing content (the skill makes the agent do this with you).
- Background music isn't automated yet; HyperFrames supports audio tracks if you add one to a composition.

## Contributing

Issues and pull requests are welcome.

```bash
npm install
npm test        # unit tests (scanner, captions, formats)
```

Please don't commit generated content or any real app's data: brands, screenshots, plans, audio and videos belong in your workspace, and the `.gitignore` blocks them. Use fictional apps in examples and tests. Agents working on this repo follow [AGENTS.md](AGENTS.md).

## License and credits

[MIT](LICENSE) © Codebless

Built on [HyperFrames](https://github.com/heygen-com/hyperframes) (Apache-2.0), [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) via [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx), [Puppeteer](https://pptr.dev), [GSAP](https://gsap.com) and [FFmpeg](https://ffmpeg.org) — each under its own license.
