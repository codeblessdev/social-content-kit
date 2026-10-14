# Platforms

| platform | formats (`format`) | size | notes |
|---|---|---|---|
| instagram | `post`, `carousel` | 1080×1350 | carousels of 2 to 20 slides; the first one has to stop the scroll |
| instagram | `square` | 1080×1080 | |
| instagram | `reel`, `story` | 1080×1920 | reels of 15 to 60 s; safe area 220 px top and 420 px bottom |
| youtube | `short` | 1080×1920 | up to 60 s; the hook has to land in the first second |
| youtube | `video` | 1920×1080 | tutorials; chapters in the description |
| youtube | `thumbnail` | 1280×720 | big text, 5 words max |
| tiktok | `video` | 1080×1920 | safe area 480 px bottom (description and buttons) |
| linkedin | `post`, `carousel` | 1080×1350 | more sober tone |
| x | `post` / `video` | 1600×900 / 1920×1080 | |
| facebook | `post` / `reel` | 1080×1350 / 1080×1920 | |

Any piece can override its size with `"size": [width, height]`.

Captions (post text): Instagram and TikTok allow long text, but only the first 1–2 lines show: put what matters first.
Hashtags: 3 to 5 relevant ones, lowercase, no accents, in the plan's language. On YouTube, a title of up to ~60 characters in `title` and the description in `caption`.
