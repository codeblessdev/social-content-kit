# brand.json

`sck brand init` writes a draft (`"status": "draft"`) and a `scan.json` with everything it found in the code. Your job is to curate it.

## Tokens

Pieces only use these tokens; all of them must exist:

| token | what it is |
|---|---|
| `bg` | page background (light or dark, the landing page's) |
| `surface` | cards on top of the background |
| `ink` | main text and the background of dark scenes |
| `ink-soft` | secondary text |
| `muted` | kickers, notes, footer |
| `line` | subtle borders (`rgba`) |
| `on-ink` | text on `ink` |
| `accent` | brand highlight color (step numbers, highlighted bar) |
| `positive` | green or second color (positive deltas) |
| `font-display` | headings, with fallback (`'Instrument Serif', Georgia, serif`) |
| `font-body` | body text, with fallback |
| `radius` | card corner radius (`28px`) |

**Take the colors from the app's public face** (landing, home, login), not its internal dashboard: dashboards often use framework
blues and grays that aren't the brand. `scan.json` → `colors` is sorted by frequency and includes `css_vars`; open the
`landing_candidates` files and their styles to confirm. Check contrast: `ink` on `bg` and `on-ink` on `ink`.

Fonts: `sck brand init` downloads the Google Fonts it finds and writes `fonts.css`. If the brand uses a local font
(a `.woff2` in the repo), copy it to `brands/<id>/fonts/` and add its `@font-face` to `fonts.css`.

## Voice and facts

- `voice.language`: language and register as used by the app (e.g. "Spanish (Argentina), informal voseo" or "en-US, friendly").
  This is the brand's own language; each project chooses its content language separately.
- `voice.rules`: 3 to 6 rules observed in the real copy (sentence length, punctuation, emojis, who it talks to).
- `voice.examples`: 3 to 5 sentences taken verbatim from the landing page.
- `facts`: `pitch`, `problem`, `steps`, `features` ({title, text, photo}), `plans` ({name, price, note, featured, extra}),
  `trial`, `cta`. **Only what's in the code, the README or what the person tells you.**
- `photos`: describe each photo in one line (what it shows, portrait or landscape) so you can pick it without opening it.
- `demo_numbers`: the landing page's sample numbers, if any.
- `handle`: the account where content is published. Ask if you don't know it.

Before confirming, show the person: palette (hex), fonts, 3 voice examples and the list of facts.
