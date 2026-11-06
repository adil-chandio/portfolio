# adil-chandio/portfolio

Personal portfolio website of **Adil Chandio** — AI learner • content creator • developer.

- Opens with the MONARCH portfolio film — 37 seconds (sound on, one-tap enter, skippable, once per session, replayable from the nav).
- Single-page site: hero, about, skills, featured work, contact — original design, no templates.
- Plain HTML/CSS/JS, no build step. Fonts: Manrope + IBM Plex Mono (OFL, see `assets/fonts/`).

## Run locally

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

## Structure

```
index.html            single-page site + intro curtains
assets/styles.css     design system (ink / paper / red)
assets/main.js        intro flow, reveals, contact form
assets/portrait-masked.png   masked portrait cutout (RGBA)
assets/work-*.jpg     poster frames for work cards
assets/thumbs/monarch-*.jpg  posters for the MONARCH film cards
media/monarch-portfolio-v5.mp4   main MONARCH portfolio film (intro + first card)
media/monarch-01-web.mp4 … monarch-05-web.mp4   MONARCH motion studies (AAC-LC audio)
media/monarch-reference-06-enhanced.mp4 / -07-enhanced.mp4   silent MONARCH studies
media/paanch.web.mp4  Paanch Rules — motivational short
media/lawone.web.mp4  Monarch: Law One — cinematic law story
media/proof-loop.web.mp4   analytics proof loop
```

© 2026 Adil Chandio — built from scratch.
