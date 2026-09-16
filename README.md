# Franke lah, Bäumli ha

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
assets/qr.png             the TWINT QR code; clicking it opens `QR_LINK` (config.js)
docs/design-brief.md      prompt for a visual redesign
test/                     node --test suite (jsdom for the page)
```

## Trees counter

`assets/trees.json` holds the number of trees financed so far (1 CHF = 1
tree). `.github/workflows/trees.yml` regenerates it every 10 minutes with
`scripts/trees.js`, which sums confirmed CHF transactions of the campaign's
products via the Payrexx API and commits the file when the count changed.
The workflow needs the repository secret `PAYREXX_SECRET` (Payrexx API key
of the `bridged` instance). The page fetches the JSON; `TREES_PLANTED` in
`config.js` is only the fallback until it has loaded. Manual refresh:
Actions → "Update trees counter" → Run workflow.

## Before launch

- `assets/qr.png` is the TWINT QR. The hero button opens `CTA_URL` and a
  click on the QR opens `QR_LINK` (both in `config.js`, both Payrexx pages);
  each is also written statically into `index.html` — keep them in sync.
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
