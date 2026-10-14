# App screens

## If the person has screenshots

- Ask for specific screenshots: "the main list with several records", "this month's chart". High resolution is best,
  without real customer data.
- Save them in `brands/<id>/assets/screens/<name>.png`. In videos they end up in `assets/brand/screens/` (`sck video sync`).
- If they show personal data or customer names, cover them (a block with `backdrop-filter: blur()` over that area in the scene,
  or crop the image).
- Real screenshots are never translated, whatever the content language. If that clashes with the video's language, say so in the plan.
- Check what they actually show before using them: duplicated files, empty states, odd values (e.g. ∞ stock) or a screen that isn't
  the one requested. Tell the person and propose a fix (a new screenshot, a tighter crop, or rebuilding that screen).

## If they don't: rebuild them from the code

1. Find the component for that screen (`features/`, `pages/`, `views/`, `routes/`…) and read its template and styles.
2. Recreate in HTML **only what the video shows** (header, table, cards, chart, form) inside the scene, using the app's own
   colors and fonts for that screen. It doesn't need to work.
3. **Language**: use the plan's `ui_language`. If it's the app's original language, copy the labels from the template verbatim;
   if it's the content language, translate menus, buttons, labels and sample data consistently. Ask the person if `ui_language` is missing.
4. Believable sample data: `demo_numbers` and generic product names. Never real data. Passwords only as dots.
5. Say so in the plan: "screen rebuilt from code" (and in which language).
6. Look at it with `sck snapshot` and compare it with the original component. Fix anything that doesn't match before moving on.

Rebuilt screens can be animated (typing into a form, a counter going up, rows sliding in), which screenshots can't.
Alternative: if the app runs locally and the person starts it, take screenshots with headless Chrome (puppeteer) against the local URL with test data.
