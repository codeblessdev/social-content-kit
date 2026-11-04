# ElevenLabs voice-over

Use it when the person asks for an ElevenLabs voice instead of Kokoro. `sck voice` only supports Kokoro, so the
ElevenLabs takes are made by hand and then wired with `sck timing`.

## Why the web and not the API

On a free account the API refuses library voices (`paid_plan_required`: "Free users cannot use library voices via the API").
The web app does let you use them. So: **generate in the web, download through the API** (`/v1/history` works on any plan).

## 1. Generate in the web (browser automation)

- Use the person's browser where they are logged in to ElevenLabs (ask which one if several are connected).
- `https://elevenlabs.io/app/speech-synthesis/text-to-speech` → voice selector (right panel) → search the voice → **Usar / Use**.
  Check the model in the right panel (e.g. **Eleven v4**).
- For each scene, in plan order: click the text editor, `ctrl+a`, type the scene's `voice` text, click **Generar discurso / Generate speech**,
  wait ~8 s. The credits counter next to the button goes down by the character count; if it doesn't, the take wasn't generated.
- Each generation creates **two** history items: `eleven_v4` (Generation 1) and `eleven_v4_exp` (Generation 2). Use `eleven_v4`.

Plan entry: `"voice": { "engine": "elevenlabs", "voice": "<name>", "model": "eleven_v4", "note": "generated in the web, normalized to -16 LUFS" }`.

## 2. Download through the API

`ELEVENLABS_API_KEY` must be in the environment. The key may not be allowed to read `text`/`voice_name` (they come back `null`),
so match takes to scenes **by order**: note the `date_unix` of the first take and take the `eleven_v4` items from there, oldest first.

```python
import json, os, urllib.request
key = os.environ["ELEVENLABS_API_KEY"]
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={"xi-api-key": key}))
hist = json.load(get("https://api.elevenlabs.io/v1/history?page_size=50"))["history"]
items = sorted([h for h in hist if h["date_unix"] >= FIRST_TAKE_UNIX and h["model_id"] == "eleven_v4"], key=lambda h: h["date_unix"])
assert len(items) == len(SCENES)
for sc, it in zip(SCENES, items):
    open(f"voz-el/{PIECE}__{sc}.mp3", "wb").write(get(f"https://api.elevenlabs.io/v1/history/{it['history_item_id']}/audio").read())
```

Sanity check: the durations (`ffprobe`) should follow the length of each scene's text. If one is off, regenerate that scene.

## 3. Wire into the video

Raw takes live in `projects/<project>/voz-el/<piece>__<scene>.mp3`. For each one:

1. Trim the silence and normalize to −16 LUFS:
   `ffmpeg -i in.mp3 -af "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 -b:a 192k <piece>/assets/voice/<scene>.mp3`
2. Write `<piece>/assets/voice/voice.json`: `{ "<scene>": { "key": "elevenlabs-<voice>-norm16", "file": "<scene>.mp3", "duration": <s> } }`.
3. `sck timing <project> <piece>` sets the scene lengths, the audio clips and the captions from that manifest.

Keep the steps in a `build.sh` in the project, so changing a take or the music takes one command. Start from
[elevenlabs-build.sh](elevenlabs-build.sh): copy it to `projects/<project>/build.sh` and set `PIECE` and `VOICE_KEY`.
It runs steps 1–3, writes silent placeholders with an estimated length (≈2.9 words/s) when a take is missing (so you can build
the visuals before the voices exist), and puts `music/bgm.mp3` in a `<!-- sck:music -->…<!-- /sck:music -->` block
with a volume automation (fade in/out, ~0.18–0.22 under the voice).

## Music

Pixabay Music (free, no attribution required): the search page is JS-rendered. Open it in the browser, read each track's page and take the
`https://cdn.pixabay.com/download/audio/…mp3` URL from its HTML, then `curl` it with a browser user agent and `-e https://pixabay.com/`.
Note the title and author in the plan's `music`.
