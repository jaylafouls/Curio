// Curio extension — build/runtime config.
//
// API_BASE is the origin the extension talks to for /api/extension/*. Two values
// matter:
//   • DEV:  http://localhost:3000  (a local `next dev` / `next start`)
//   • PROD: the deployed Curio origin
//
// ⚠️ PLACEHOLDER: the production origin below is a guess (https://curio.app). It
// MUST be set to the real deployed domain before the store build. The matching
// entry in manifest.json host_permissions must be kept in sync.
//
// To point the extension at local dev while testing, flip API_BASE to the
// localhost value (and ensure localhost is in manifest host_permissions — it is).

const CONFIG = {
  // API_BASE: 'http://localhost:3000',
  API_BASE: 'https://curio.app',
}

// Expose for the popup (classic script, no modules — simplest MV3 packaging).
globalThis.CURIO_CONFIG = CONFIG
