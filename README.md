# Fränkli gebe, Bäume lebe

One-page campaign site: donate 1 CHF via QR code → one tree planted per franc,
plus a free prize draw (50 CHF). Static HTML/CSS/JS, no build step. Entries are
stored in a Google Sheet through a small Apps Script web app.

Languages: DE (Swiss spelling) / FR / EN, switchable on the page or via `?lang=fr`.
Deadline: Saturday 19.09.2026 23:59 (Europe/Zurich) — enforced in the browser
and in the Apps Script.

## Files

```
index.html               the page; APP_CONFIG.endpoint lives in its inline <script>
assets/style.css         styling
assets/i18n.js           DE/FR/EN strings
assets/logic.js          pure helpers (language pick, payload, status mapping)
assets/app.js            DOM wiring
assets/qr-placeholder.svg swap for the real QR code, keep the filename
apps-script/Code.gs      backend to paste into the Google Sheet's script editor
test/                    node --test suite (jsdom for the page)
```

## Setup (about 15 minutes)

### 1. Google Sheet + Apps Script

1. Create a new Google Sheet (any name). The script creates a tab `Entries` on first submission.
2. Extensions → Apps Script. Replace the contents of `Code.gs` with `apps-script/Code.gs` from this repo. Save.
3. Deploy → New deployment → type **Web app**:
   - Description: anything
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Authorise when prompted (the script only touches this sheet).
5. Copy the **Web app URL** (ends in `/exec`).
6. Smoke test in a terminal — expect `{"ok":true,"code":"alive"}`:
   ```sh
   curl -L '<WEB_APP_URL>'
   ```
   and a real write — expect `{"ok":true,"code":"ok"}` and a new row in the sheet; running it twice yields `duplicate`:
   ```sh
   curl -L '<WEB_APP_URL>' --data '{"email":"test@example.com","phone":"079 123 45 67","donated":"yes","why":"test","amount":1,"lang":"de","website":""}'
   ```
   Do **not** add `-X POST`: Apps Script answers with a 302 that must be followed
   as GET, and `-X` forces POST onto the redirect (405 "Seite nicht gefunden").
   A freshly created deployment can also answer "Seite nicht gefunden" for a
   minute or two before it propagates. Delete the test row afterwards.

After **any** change to `Code.gs`: Deploy → Manage deployments → edit → Version: **New version** → Deploy. The URL stays the same.

### 2. Point the page at the script

In `index.html`, replace `PASTE_APPS_SCRIPT_WEB_APP_URL` with the web app URL.

### 3. Fill in the placeholders

- `assets/qr-placeholder.svg` → replace with the real QR (PNG/SVG); if you change the filename, update the `src` in `index.html`.
- In `assets/i18n.js` (all three languages): `[NAME]`, `[UNIVERSITÄT]`/`[UNIVERSITÉ]`/`[UNIVERSITY]`, `[KONTAKT-E-MAIL]`/`[E-MAIL DE CONTACT]`/`[CONTACT EMAIL]`.

### 4. GitHub Pages

1. Push this folder to a **public** GitHub repository (Pages is free only for public repos).
2. Repository → Settings → Pages → Source: *Deploy from a branch*, Branch: `main`, folder `/ (root)`.
3. The site appears at `https://<user>.github.io/<repo>/` after a minute. All asset paths are relative, so the sub-path works.

## Development

```sh
npm install        # jsdom, test only
npm test           # 47 tests: strings, logic, backend core, page behaviour
npm run serve      # http://localhost:8000
```

`processEntry()` in `Code.gs` is pure and tested in Node; only `doGet`/`doPost`
touch Google services.

## Data

Sheet columns: Timestamp · Language · Email · Phone · Donated · Why · Amount CHF · User agent.
One entry per email (case-insensitive). A hidden honeypot field silently drops
bots. After the draw, delete the sheet as promised in the terms.
