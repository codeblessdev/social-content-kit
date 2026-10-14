---
name: social-content
description: Creates social media content (images, carousels, reels and videos with AI voice-over and captions) in an app's own visual style, starting from its repo (a link or a local folder). Use when someone asks for posts, reels, videos, carousels, tutorials, memes or any content for Instagram, YouTube, TikTok, LinkedIn or another network about an app or product.
---

# Social content

You produce pieces ready to review and publish: images, carousels and videos (HyperFrames) with local voice-over (Kokoro) and captions.
Everything goes through this kit's `sck` CLI. **Never publish or schedule anything on a social network**: the person reviews and posts.

Talk to the person in their own language, whatever the content language is.

## 0. Before you start

1. Run `sck doctor`. If `sck` doesn't exist, follow "Installation" in the kit's README and come back.
2. Workspace: unless the person says otherwise, use `./social-content` (or `$SCK_WORKSPACE`). Pass `--workspace <dir>` to every command if it's not the current one.
3. Run `sck brands` to see which apps already have a brand.

## 1. Initial questions (always, all five together)

Ask them in a single message. If your environment has a tool for multiple-choice questions, use it; otherwise number them in text.
Every question accepts "other" with free text. If the person already answered one in their request, don't ask it again: confirm it in the summary.

1. **Which app?** The brands from `sck brands`, plus "Another one: give me the repo link (GitHub, GitLab…) or the folder on your computer".
2. **What type of content?** Image · Carousel · Reel/short video · Landscape video · Other.
3. **Which platform?** Instagram · YouTube · TikTok · LinkedIn · Other.
4. **What's the goal?** Marketing/sales · Reach/views · Meme · Tutorial for a module · Other.
5. **Which language for the voice-over, captions and on-screen text?** Offer the brand's language first (`voice.language` in `brand.json`, or the language of the app's UI), then English, Spanish, Portuguese and "Other". `sck languages` lists the languages that have a default voice.

Save the answer as `"language"` in the plan (BCP 47: `en`, `en-GB`, `es`, `es-AR`, `pt-BR`, `fr`, `it`, `hi`, `ja`, `zh`…).
It sets the voice-over and its pronunciation, the captions, the text you write on screen, the template's UI words ("Swipe", "Recommended"),
number formatting and `<html lang>`. If the language has no default voice, pick a Kokoro voice with the person (`npx hyperframes tts --list`).

## 2. Brand

- **New app**: `sck brand init <link|folder> --id <id>`. Then read `brands/<id>/scan.json` and the code of the landing or public home page
  (`landing_candidates`) and complete `brand.json` following [references/brand.md](references/brand.md).
  Show the person a summary (palette, fonts, 3 sample sentences in its voice, product facts) and **wait for their OK**
  before setting `"status": "confirmed"`.
- **Existing app**: use its `brand.json` as is. If it's still a `draft`, complete it first.
- If the link is private and `git` can't clone it, ask the person to clone it and give you the folder.

The brand's copy (`voice`, `facts`) may be in a different language from the content: translate it faithfully, never add facts while translating.

## 3. Follow-up questions (only the ones that apply)

- **App screens** (videos, tutorials or any piece that shows screens): ask for screenshots of the specific screens you need,
  saying which ones and why. Save them in `brands/<id>/assets/screens/` (or in the project folder if they're one-off).
  If they don't have any, offer to **rebuild the screens from the code** (the app's HTML/CSS with sample data). See [references/screens.md](references/screens.md).
- **Language of rebuilt screens** (only when you'll rebuild screens from the HTML): ask whether their text (menus, buttons, labels,
  sample data) stays **in the app's original language** or is **translated to the content language**. Save it as `"ui_language"` in the plan.
  Real screenshots are never translated.
- **Voice-over**: yes or no? Female or male voice (the default for the chosen language, see `sck languages`) or a specific Kokoro voice; speed.
  Requires `sck setup voice` once.
- **Captions**: on by default when there's voice-over (most people watch without sound). Same language as the voice-over.
- **Length**, **CTA** and any material of their own (logo, photos, music).

## 4. Plan → wait for approval

1. `sck project new "<name>" --brand <id> --platform <platform> --language <code> [--ui-language <code>] --goal <goal>`
   creates `projects/<date>-<name>/plan.json`.
2. Complete `plan.json` following [references/plan.md](references/plan.md) and [references/goals.md](references/goals.md); formats in [references/platforms.md](references/platforms.md).
   Write every on-screen text, narration line, caption and hashtag in the plan's `language`.
3. Show the plan in a readable form: per piece, format and size; for videos, a table of scenes with *estimated time · what's on screen ·
   on-screen text · narration*; the language(s); voice; caption and hashtags; what material is missing.
4. **Don't produce anything until the person approves the plan.** If they ask for changes, update `plan.json` and show it again.

## 5. Production

**Images and carousels**: `sck render <project> --only <piece>`. If you see `⚠ … doesn't fit the frame`, shorten that text.

**Videos** (see [references/video.md](references/video.md)):
1. `sck video new <project> <piece>` creates a HyperFrames project in `projects/<project>/<piece>/` (with `<html lang>` set from the plan).
2. Write the scenes in its `index.html`: one `data-scene="<id>"` element per scene in the plan, using the `kit.js` helpers.
3. `sck voice <project> <piece>` (or `sck timing …` without voice-over) sets each scene's length from its narration,
   generates the captions and writes the timing into the HTML. Run it again whenever the narration or the scenes change.
4. `sck check <project> <piece>` and fix the errors.
5. `sck snapshot <project> <piece>` and **look at the images**: cut-off text, captions covering something, empty scenes, contrast, wrong language.
6. `sck render <project> --only <piece> --draft` to review, and without `--draft` once approved.

## 6. Delivery

Give the path to `projects/<project>/out/index.html` (every piece with its caption), a summary of what you did and the assumptions
you made (demo numbers, rebuilt screens and their language, chosen voice). Offer tweaks; don't publish.

## Rules

- Copy comes from `brand.json` (`voice`, `facts`). Don't invent features, prices or metrics. Real numbers only if the person gives them
  or they come from a source they pointed to; otherwise use `demo_numbers` and don't present them as real.
- Never show real customer data or personal data. In the person's screenshots, cover names, emails, phone numbers or tax IDs.
- Never show passwords: animate them as dots and don't write them to any file.
- Ragebait and humor are fine, but aimed at *the situation* (the old system, the spreadsheet), never at a named competitor.
  If a screenshot shows another product's name or logo, blur it.
- Respect each platform's safe area (`sck` writes it as `--safe-top` and `--safe-bottom`).
