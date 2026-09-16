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
assets/qr.png             the TWINT QR code; clicking it opens the link it encodes
docs/design-brief.md      prompt for a visual redesign
test/                     node --test suite (jsdom for the page)
```

## Before launch

- `assets/qr.png` is the TWINT QR. The QR and the hero button both link to
  `QR_URL` (in `config.js`), the URL encoded in the QR — re-decode and update
  it if the QR is regenerated.
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
