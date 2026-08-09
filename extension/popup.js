/* Curio extension popup logic (Phase 5 chantier 5).
 *
 * AUTH: a dedicated bearer token (NOT the web cookie — no cross-origin cookie
 * sharing, Decisions Log §17). The token is minted in the web app (/settings),
 * pasted here once, and kept in chrome.storage.local. Every API call sends it as
 * `Authorization: Bearer <token>`.
 *
 * THREE V1 ACTIONS, each a thin call to /api/extension/*:
 *   1. resolve      — POST /api/extension/resolve   { url } → { linkId, ... }
 *   2. collections  — GET  /api/extension/collections       → { collections }
 *   3. save         — POST /api/extension/save      { ... } → { userLinkId, ... }
 *
 * PRIVACY: the extension sets NO cookies and sends NO analytics. It stores only
 * the token, locally. The Privacy Policy link points at the web app's policy.
 */

const API_BASE = (globalThis.CURIO_CONFIG && globalThis.CURIO_CONFIG.API_BASE) || ''
const TOKEN_KEY = 'curio_token'

// ── DOM refs ────────────────────────────────────────────────────────────────
const views = {
  connect: document.getElementById('view-connect'),
  save: document.getElementById('view-save'),
  done: document.getElementById('view-done'),
  loading: document.getElementById('view-loading'),
}

const els = {
  tokenInput: document.getElementById('token-input'),
  connectBtn: document.getElementById('connect-btn'),
  connectError: document.getElementById('connect-error'),
  pageTitle: document.getElementById('page-title'),
  pageUrl: document.getElementById('page-url'),
  collectionSelect: document.getElementById('collection-select'),
  sectionField: document.getElementById('section-field'),
  sectionSelect: document.getElementById('section-select'),
  noteInput: document.getElementById('note-input'),
  saveBtn: document.getElementById('save-btn'),
  saveError: document.getElementById('save-error'),
  disconnectBtn: document.getElementById('disconnect-btn'),
  doneCollection: document.getElementById('done-collection'),
  saveAnotherBtn: document.getElementById('save-another-btn'),
  privacyLink: document.getElementById('privacy-link'),
}

// Per-session working state.
let state = {
  token: null,
  tab: null, // { url, title }
  linkId: null,
  collections: [], // SaveTargetCollection[]
}

// ── View switching ───────────────────────────────────────────────────────────
function show(view) {
  for (const key of Object.keys(views)) {
    views[key].hidden = key !== view
  }
}

function setError(el, message) {
  if (!message) {
    el.hidden = true
    el.textContent = ''
    return
  }
  el.textContent = message
  el.hidden = false
}

// ── Token storage ────────────────────────────────────────────────────────────
function getStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(TOKEN_KEY, (res) => resolve(res[TOKEN_KEY] || null))
  })
}
function storeToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [TOKEN_KEY]: token }, () => resolve())
  })
}
function clearToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(TOKEN_KEY, () => resolve())
  })
}

// ── API ──────────────────────────────────────────────────────────────────────
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${state.token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try {
    json = await res.json()
  } catch {
    // Non-JSON body (unexpected) — surface a generic failure.
  }
  return { status: res.status, json }
}

// ── Current tab ──────────────────────────────────────────────────────────────
function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0]
      resolve(tab ? { url: tab.url || '', title: tab.title || '' } : null)
    })
  })
}

// ── Flows ─────────────────────────────────────────────────────────────────────

/** Verify a pasted token by hitting a token-gated route; connect on success. */
async function handleConnect() {
  const token = els.tokenInput.value.trim()
  if (!token) return
  setError(els.connectError, '')
  els.connectBtn.disabled = true
  state.token = token
  // A cheap token-gated call doubles as verification: collections returns 200
  // only for a valid token.
  const { status } = await api('/api/extension/collections')
  if (status === 401) {
    state.token = null
    els.connectBtn.disabled = false
    setError(els.connectError, 'That token is invalid or has been revoked.')
    return
  }
  if (status !== 200) {
    state.token = null
    els.connectBtn.disabled = false
    setError(els.connectError, "Couldn't reach Curio. Please try again.")
    return
  }
  await storeToken(token)
  els.connectBtn.disabled = false
  els.tokenInput.value = ''
  await enterSaveFlow()
}

/** Load the current tab, resolve its link, and load collections. */
async function enterSaveFlow() {
  show('loading')
  setError(els.saveError, '')

  state.tab = await getActiveTab()
  if (!state.tab || !/^https?:\/\//i.test(state.tab.url)) {
    show('save')
    els.pageTitle.textContent = state.tab ? state.tab.title : ''
    els.pageUrl.textContent = state.tab ? state.tab.url : ''
    setError(els.saveError, "This page can't be saved.")
    els.saveBtn.disabled = true
    return
  }

  // Resolve the link (canonicalize into `links`) + load collections in parallel.
  const [resolveRes, collRes] = await Promise.all([
    api('/api/extension/resolve', { method: 'POST', body: { url: state.tab.url } }),
    api('/api/extension/collections'),
  ])

  if (resolveRes.status === 401 || collRes.status === 401) {
    await handleAuthExpired()
    return
  }

  if (resolveRes.status !== 200 || !resolveRes.json || !resolveRes.json.ok) {
    show('save')
    renderPage(resolveRes.json)
    setError(els.saveError, "Couldn't read this page. You can still save it.")
  }

  if (collRes.status === 200 && collRes.json && collRes.json.ok) {
    state.collections = collRes.json.collections || []
  }

  state.linkId = resolveRes.json && resolveRes.json.ok ? resolveRes.json.linkId : null
  renderPage(resolveRes.json)
  renderCollections()
  els.saveBtn.disabled = !state.linkId
  show('save')
}

function renderPage(resolved) {
  const title =
    resolved && resolved.ok && resolved.title ? resolved.title : state.tab.title
  els.pageTitle.textContent = title || state.tab.url
  els.pageUrl.textContent = state.tab.url
}

function renderCollections() {
  // Reset to just the Unsorted option, then append the user's collections.
  els.collectionSelect.innerHTML = '<option value="">Unsorted</option>'
  for (const c of state.collections) {
    const opt = document.createElement('option')
    opt.value = c.id
    opt.textContent = c.name
    els.collectionSelect.appendChild(opt)
  }
  renderSections()
}

function renderSections() {
  const collectionId = els.collectionSelect.value
  const collection = state.collections.find((c) => c.id === collectionId)
  const sections = collection ? collection.sections || [] : []
  if (sections.length === 0) {
    els.sectionField.hidden = true
    els.sectionSelect.innerHTML = '<option value="">None</option>'
    return
  }
  els.sectionField.hidden = false
  els.sectionSelect.innerHTML = '<option value="">None</option>'
  for (const s of sections) {
    const opt = document.createElement('option')
    opt.value = s.id
    opt.textContent = s.name
    els.sectionSelect.appendChild(opt)
  }
}

async function handleSave() {
  if (!state.linkId) return
  setError(els.saveError, '')
  els.saveBtn.disabled = true

  const collectionId = els.collectionSelect.value || null
  const sectionId = (collectionId && els.sectionSelect.value) || null
  const note = els.noteInput.value.trim() || null

  const { status, json } = await api('/api/extension/save', {
    method: 'POST',
    body: {
      linkId: state.linkId,
      urlOrigin: state.tab.url,
      collectionId,
      sectionId,
      note,
    },
  })

  if (status === 401) {
    await handleAuthExpired()
    return
  }
  if (status !== 200 || !json || !json.ok) {
    els.saveBtn.disabled = false
    setError(els.saveError, "Couldn't save. Please try again.")
    return
  }

  els.doneCollection.textContent = json.collectionName
    ? `In "${json.collectionName}"`
    : 'In Unsorted'
  show('done')
}

/** Token no longer valid mid-flow — drop it and return to Connect. */
async function handleAuthExpired() {
  await clearToken()
  state.token = null
  show('connect')
  setError(els.connectError, 'Your token expired or was revoked. Reconnect to continue.')
}

async function handleDisconnect() {
  await clearToken()
  state.token = null
  els.tokenInput.value = ''
  setError(els.connectError, '')
  show('connect')
}

// ── Init ──────────────────────────────────────────────────────────────────────
function initPrivacyLink() {
  // Point at the web app's Privacy Policy (About page hosts it; the app's footer
  // links there). Locale-agnostic: land on the default locale.
  els.privacyLink.href = `${API_BASE}/en/about`
}

async function init() {
  initPrivacyLink()
  els.connectBtn.addEventListener('click', handleConnect)
  els.tokenInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleConnect()
  })
  els.collectionSelect.addEventListener('change', renderSections)
  els.saveBtn.addEventListener('click', handleSave)
  els.disconnectBtn.addEventListener('click', handleDisconnect)
  els.saveAnotherBtn.addEventListener('click', () => {
    els.noteInput.value = ''
    enterSaveFlow()
  })

  const token = await getStoredToken()
  if (token) {
    state.token = token
    await enterSaveFlow()
  } else {
    show('connect')
  }
}

init()
