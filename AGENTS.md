# Instructions for agents

This repo is **social-content-kit**: a CLI (`sck`) and a skill to create images, carousels and videos for social media
in any app's visual style.

When the person asks for social media content (posts, reels, carousels, videos, tutorials, memes), follow
[skills/social-content/SKILL.md](skills/social-content/SKILL.md) step by step. The initial questions and the plan approval are not optional.

When working on the kit itself:
- `bin/sck.mjs` is the CLI; the logic lives in `src/`. Templates in `templates/still/` (images) and `templates/video/` (HyperFrames).
- Nothing in this repo may depend on a specific app or brand: brands, projects and outputs live in each person's workspace.
- **Never commit generated content or any app's data** (brand.json, screenshots, photos, plans, voice-over, videos, customer or store names). Use fictional apps in examples and tests.
- Code, comments, CLI messages and docs are in English.
- Test changes with `npm test` and with a real render (`sck render <project> --draft`).
