# Curio — Chrome extension (MV3)

Save the page you're on to Curio: resolve the URL, pick a collection (+ section),
add a note, save. Three V1 actions, each a thin call to the app's
`/api/extension/*` routes.

## Auth model

The extension does **not** use the web session cookie (no cross-origin cookie
sharing — Decisions Log §17). It carries a **dedicated bearer token**:

1. In the web app: **Settings → Chrome extension → Generate token**. The raw
   token is shown once.
2. Paste it into the extension popup (**Connect**). It's stored in
   `chrome.storage.local` and sent as `Authorization: Bearer <token>` on every
   request.
3. Revoke a token any time from Settings — the extension drops back to the
   Connect screen on the next call.

The extension sets **no cookies** and sends **no analytics**.

## Files

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest (action popup, `activeTab` + `storage` perms, host permissions) |
| `config.js` | `API_BASE` — the Curio origin the extension talks to |
| `popup.html` / `popup.css` / `popup.js` | The popup UI + logic (connect / save / done) |
| `icons/` | 16 / 48 / 128 px action + store icons (brand orbital "C", regenerated from the design-system SVG) |

## Configure the API origin

`config.js` → `API_BASE`:

- **Local dev:** `http://localhost:3000` (uncomment the dev line). `localhost`
  is already in `manifest.json` `host_permissions`.
- **Production:** the deployed Curio origin (`https://curio-neon.vercel.app`),
  set in both `config.js` (`API_BASE`) and the `host_permissions` entry in
  `manifest.json`. Keep the two in sync if the domain changes.

## Load unpacked (dev)

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select this `extension/` directory.
3. Ensure the app is running at the `API_BASE` origin and a token is generated.

## Store submission

Out of scope for this chantier (done manually by the PO). Before submitting:

- Set the real production `API_BASE` + `host_permissions`.
- Fill in the Chrome Web Store listing (screenshots, description, Privacy Policy
  URL — the popup already links to `<API_BASE>/en/about`).
- Bump `version` in `manifest.json`.
