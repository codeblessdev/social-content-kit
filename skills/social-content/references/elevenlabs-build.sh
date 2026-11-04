#!/usr/bin/env bash
# Template: copy to projects/<project>/build.sh and set PIECE and VOICE_KEY.
# Usage: ./build.sh [music-volume]
#
# Normalizes the ElevenLabs takes (voz-el/<piece>__<scene>.mp3) to -16 LUFS, writes assets/voice/voice.json,
# runs `sck timing` (scene lengths, audio clips, captions) and puts the music under the voice.
# A missing take becomes silence with an estimated length (~2.9 words/s), so the visuals can be built first.
# Music (optional): music/bgm.mp3 in the project folder.
set -euo pipefail
cd "$(dirname "$0")"
P=$(basename "$PWD")                 # project = this folder's name
PIECE=my-piece                       # piece id from plan.json
VOICE_KEY=elevenlabs-myvoice-norm16  # any label; changing it marks the takes as new
VOL=${1:-0.2}

python3 - "$PIECE" "$VOICE_KEY" <<'PY'
import json, subprocess, sys, os
piece_id, voice_key = sys.argv[1], sys.argv[2]
plan = json.load(open("plan.json"))
piece = next(p for p in plan["pieces"] if p["id"] == piece_id)
vdir = f"{piece_id}/assets/voice"; os.makedirs(vdir, exist_ok=True)
dur = lambda f: float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f]).decode())
manifest = {}
for sc in piece["scenes"]:
    src, out = f"voz-el/{piece_id}__{sc['id']}.mp3", f"{vdir}/{sc['id']}.mp3"
    if os.path.exists(src):
        # trim leading/trailing silence and normalize to -16 LUFS
        af = "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11"
        subprocess.run(["ffmpeg","-loglevel","error","-y","-i",src,"-af",af,"-ar","44100","-b:a","192k",out], check=True)
        key = voice_key
    else:
        est = round(len(sc["voice"].split()) / 2.9, 2)
        subprocess.run(["ffmpeg","-loglevel","error","-y","-f","lavfi","-i","anullsrc=r=44100:cl=mono","-t",str(est),"-b:a","64k",out], check=True)
        key = "placeholder-silence"
    manifest[sc["id"]] = {"key": key, "file": f"{sc['id']}.mp3", "duration": round(dur(out), 3)}
    print(f"  {sc['id']:12} {manifest[sc['id']]['duration']:6.2f}s  {key}")
json.dump(manifest, open(f"{vdir}/voice.json","w"), indent=2)
PY

# sck runs from the workspace (the folder that contains social-content/)
(cd ../../.. && sck timing "$P" "$PIECE")

[ -f music/bgm.mp3 ] || { echo "  no music/bgm.mp3, skipping music"; exit 0; }
mkdir -p "$PIECE/assets/music" && cp music/bgm.mp3 "$PIECE/assets/music/bgm.mp3"
python3 - "$PIECE/index.html" "$VOL" <<'PY'
import json, re, sys
f, vol = sys.argv[1], float(sys.argv[2])
html = open(f).read()
total = float(re.search(r'<div id="root"[^>]*data-duration="([\d.]+)"', html).group(1))
auto = {"version": 1, "lanes": [{"target": "volume", "points": [
    {"t": 0, "v": 0}, {"t": 0.6, "v": vol}, {"t": round(total - 1.6, 3), "v": vol}, {"t": round(total, 3), "v": 0}]}]}
tag = (f'      <audio id="music-bgm" class="clip" src="assets/music/bgm.mp3" data-start="0" data-duration="{total}" '
       f'data-volume="1" data-track-index="10" data-automation=\'{json.dumps(auto)}\'></audio>')
block = f'<!-- sck:music -->\n{tag}\n      <!-- /sck:music -->'
if '<!-- sck:music -->' in html:
    html = re.sub(r'<!-- sck:music -->[\s\S]*?<!-- /sck:music -->', block, html)
else:  # first run: add the block right after the voice-over block
    html = html.replace('<!-- /sck:voice -->', '<!-- /sck:voice -->\n      ' + block, 1)
open(f, "w").write(html)
print(f"  music: {total}s at volume {vol}")
PY
