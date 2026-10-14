# Writing a video

`sck video new` copies the template into `projects/<project>/<piece>/`. It's a [HyperFrames](https://github.com/heygen-com/hyperframes) project:
HTML + CSS + GSAP rendered to MP4 frame by frame.

## Structure

```html
<html lang="…">                                          <!-- set from the plan's "language" by sck -->
<div id="root" data-composition-id="main" …>          <!-- sck timing writes data-duration -->
  <section class="scene clip" data-scene="hook" …>     <!-- one per scene in the plan; sck writes data-start/duration -->
  …
  <!-- sck:voice --> … <!-- /sck:voice -->             <!-- voice-over audio clips: written by sck voice -->
  <div id="captions"></div>                             <!-- captions: filled by SCK.captions(tl) -->
</div>
```

- `assets/brand/`: tokens (`brand.css`), fonts and every brand asset (`photos/`, `screens/`, `refs/`, `logos/`). Don't edit: `sck video sync` regenerates it.
- `kit.css`: base classes (`.scene`, `.scene.ink`, `.display`, `.kicker`, `.lead`, `.card`, `.pill`, `.brandline`, `.screen`).
- This video's own styles: in the `<style>` of `index.html`.
- On-screen text goes in the plan's `language`; text inside rebuilt app screens goes in `ui_language` (see screens.md).

## Animation

```js
const tl = gsap.timeline({ paused: true });
const t = SCK.at("hook");                              // scene start (read from the HTML)
SCK.title("#hook h1", "Still doing it *like this?*");  // headline with animatable words
tl.fromTo("#hook h1 .w", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" }, t + 0.2);
SCK.fades(tl);      // short fade between scenes
SCK.captions(tl);   // captions
// Always last, written literally like this (the HyperFrames linter looks for it):
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
tl.seek(0);
```

- Position everything in absolute time with `SCK.at(id) + offset` (never hard-coded seconds): timings then adapt when the narration changes.
- Counters: a tween on an object with an `onUpdate` that paints the text; `SCK.thousands(n)` uses the separator of the video's language.
- Typing into a field: a tween on a character count with `onUpdate` that writes `text.slice(0, n)`; passwords as dots only.
- Determinism: no `Date.now()`, `Math.random()`, `fetch`, `setTimeout`, or uncontrolled videos/GIFs. Everything animated lives on the timeline.
- Slow zoom on an image ("Ken Burns"): `tl.fromTo(img, { scale: 1 }, { scale: 1.12, duration: SCK.dur(id), ease: "none" }, SCK.at(id))`.
- Screenshots: put them in a frame with `overflow: hidden` and choose the crop on purpose (what must be readable on a phone).
  Don't zoom in too much: show enough of the screen to recognize the app.
- Covering data: a `<div>` with `backdrop-filter: blur(14px)` positioned over that area of the image.
- Captions: at the bottom, above the safe area. If they cover something important in a scene, lift them with `--captions-lift` in that scene
  or move the content. Styling: `--caption-bg`, `--caption-fg`, `--caption-size`.
- `sck check` can flag text overlaps for elements that are hidden behind others; hide the covered elements (`visibility: hidden`) once they're no longer visible.

## Loop

`sck voice` (or `sck timing`) → `sck check` → `sck snapshot` → look → fix → `sck render --draft` → approve → `sck render`.

To preview in the browser with a timeline: `npx hyperframes preview <video-folder>`.
