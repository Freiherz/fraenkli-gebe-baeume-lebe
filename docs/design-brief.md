# Design brief — paste into claude.ai/design

Design a visually stunning, modern, mobile-first single-page website for a Swiss student campaign called **"Fränkli gebe, Bäume lebe"** (Swiss German: "give a franc, let trees live"). Current plain version for reference: https://freiherz.github.io/fraenkli-gebe-baeume-lebe/

## The campaign

- Visitors donate **1 CHF (or more) by scanning a QR code** with their banking/TWINT app. **Every franc donated = one tree planted.** That is the entire call to action — there is no form, no sign-up, nothing else to do.
- Student project from an entrepreneurship lecture, not a company — keep it honest, warm and light, not corporate.
- Audience: students and people in Switzerland, mostly on phones, arriving from a poster/flyer QR code. They decide in 10 seconds whether to scan the donation QR.

## Feel

- Fresh, optimistic, nature-forward. Think: sunlight through leaves, growth, one small coin becoming a forest. Not eco-cliché (no stock-photo hands holding seedlings), not flat corporate green.
- Palette: deep forest green + warm off-white + one warm accent (sun yellow or terracotta) for the CTA. Generous whitespace, big confident type, rounded but not bubbly.
- Typography: one expressive display face for the title and section headings, one clean sans for body. Swiss precision in the grid.
- Must look great in **both light and dark** color schemes (`prefers-color-scheme`).

## Animations (tasteful, performant, CSS/SVG only — no animation libraries)

1. **Hero**: an inline-SVG tree that grows (trunk draws up, canopy unfolds) once on load, ~1.5 s. A single coin drops into the soil first, then the tree grows — the whole concept in one motion.
2. **Scroll reveals**: sections fade/slide in once via `IntersectionObserver` + CSS transitions.
3. **Micro-interactions**: CTA button lift on hover, radio/checkbox tick animations, subtle leaf particles drifting in the hero background (very sparse, slow).
4. Respect `prefers-reduced-motion: reduce` — everything above degrades to instant states.

## Page structure (single page, top to bottom)

1. **Header**: language switch DE | FR | EN (pill buttons, current one filled), campaign title, one-line pitch.
2. **Donate section** (the whole point of the page): headline "1 Franken = 1 Baum", short lead, the **QR code** as the hero object (min 240 px on phones, framed like a card someone would actually point a phone at), three numbered steps (scan → enter amount → confirm), a small thank-you note.
3. **About section**: "Wer steckt dahinter?" — two or three sentences: student project, entrepreneurship lecture, who is responsible, all donations go into planting trees.
4. **Footer**: "Ein Studierendenprojekt · Kontakt: …" plus a one-line privacy note (no personal data collected; hosted on GitHub Pages).

## Copy (German; French and English versions exist and are swapped in by JavaScript)

- Title: *Fränkli gebe, Bäume lebe*
- Tagline: *Spende 1 Franken – wir pflanzen dafür einen Baum.*
- Donate lead: *Jeder gespendete Franken wird zu einem gepflanzten Baum. Spende so viel, wie du möchtest – schon ein Fränkli zählt.*
- Steps: *QR-Code mit deiner Banking- oder TWINT-App scannen* · *Betrag eingeben (ab 1 CHF)* · *Zahlung bestätigen – fertig, dein Baum wird gepflanzt*
- Note: *Jede Spende ist freiwillig. Danke, dass du mitpflanzt!*
- About: *«Fränkli gebe, Bäume lebe» ist ein Studierendenprojekt im Rahmen einer Entrepreneurship-Vorlesung an der [UNIVERSITÄT]. Verantwortlich: [NAME]. Die gesammelten Spenden fliessen vollständig in die Pflanzung von Bäumen.*

## Hard technical constraints (the page is wired to existing JavaScript and a test suite — keep these exactly)

- Plain **static HTML + CSS + vanilla JS**, no framework, no build step, no external JS libraries. Google Fonts allowed. All asset paths **relative** (`assets/...`), because the site lives at a sub-path on GitHub Pages.
- Keep these hooks so the existing `assets/app.js` and translations keep working:
  - Language switch: `<nav class="lang-switch">` with three `<button data-lang="de|fr|en" aria-pressed="true|false">`.
  - Every translatable text node carries `data-i18n="<key>"`; image alt uses `data-i18n-alt`, lists `data-i18n-list` (JS fills `<li>`s). Text content is injected by JS — leave elements empty or with German defaults.
  - `<img id="qr" src="assets/qr-placeholder.svg">` for the QR.
  - Script order at the end of body: `assets/i18n.js`, `assets/logic.js`, `assets/app.js`.
- Accessible: real labels, visible focus rings, contrast ≥ 4.5:1, works at 360 px width with a 16 px side gutter, no horizontal scroll.
- Lightweight: no images except the QR; everything else CSS/SVG. Target < 150 KB total, no layout shift when the tree animates.

## Deliverable

`index.html` + `assets/style.css` (and any inline SVG) that drop into the existing project and pass the constraints above. Show the design in light and dark mode, at phone width and desktop width.
