# Fränkli gebe, Bäume lebe

One-page donation campaign: donate 1 CHF via QR code → one tree planted per
franc. Static HTML/CSS/JS, no build step, no backend. Hosted on GitHub Pages:
https://freiherz.github.io/fraenkli-gebe-baeume-lebe/

Languages: DE (Swiss spelling) / FR / EN, switchable on the page or via `?lang=fr`.

## Files

```
index.html                the page
assets/style.css          styling
assets/i18n.js            DE/FR/EN strings
assets/logic.js           pure helpers (language pick, translation lookup)
assets/app.js             DOM wiring (language switch, text rendering)
assets/qr-placeholder.svg swap for the real QR code, keep the filename
docs/design-brief.md      prompt for a visual redesign
test/                     node --test suite (jsdom for the page)
```

## Before launch

- Replace `assets/qr-placeholder.svg` with the real QR code (PNG/SVG); if the
  filename changes, update the `src` in `index.html`.
- Fill the placeholders in `assets/i18n.js` for all three languages:
  `[NAME]`, `[UNIVERSITÄT]`/`[UNIVERSITÉ]`/`[UNIVERSITY]`,
  `[KONTAKT-E-MAIL]`/`[E-MAIL DE CONTACT]`/`[CONTACT EMAIL]`.

## Deploy

Push to `main`; GitHub Pages serves the repository root. All asset paths are
relative, so the `/fraenkli-gebe-baeume-lebe/` sub-path works.

## Development

```sh
npm install        # jsdom, test only
npm test           # strings, language logic, page behaviour
npm run serve      # http://localhost:8000
```
