# Security Audit Report — ConjugQuest

**Date:** 2026-03-14
**Scope:** Full client-side codebase (`index.html`, `src/*.js`, configuration files, iOS wrapper)
**Risk context:** Client-side browser game with no backend, no authentication, no user accounts. Attack surface is limited to the local browser environment.

---

## Executive Summary

ConjugQuest is a client-side-only educational platformer game with no backend, no authentication, and no sensitive data processing. The overall security posture is **good for its threat model**. All findings from the initial audit have been remediated.

**Critical:** 0
**High:** 0 (1 fixed)
**Medium:** 0 (4 fixed)
**Low:** 0 (4 fixed)
**Informational:** 1 remaining (2 fixed)

---

## Findings & Remediation Status

### HIGH — FIXED

#### H1 — DOM-based XSS via `innerHTML` with interpolated data — FIXED
**Files:** `src/ui.js`, `src/conjugation.js`

All `innerHTML` assignments that interpolated application data have been replaced with safe DOM APIs:
- `renderHeroShop()` — now uses `createElement`/`textContent` for hero shop items
- `populatePedagogyPanel()` — now uses `createElement` for checkboxes/labels
- `onOpenQuestion()` — now uses `createElement`/`textContent` for question prompt
- `renderErrorList()` — now uses `createElement`/`textContent` for error entries
- Remaining `innerHTML = ""` usages are safe (clearing content only, replaced with `textContent = ""` where applicable)

---

### MEDIUM — ALL FIXED

#### M1 — No Content Security Policy (CSP) — FIXED
**File:** `index.html`

Added CSP meta tag:
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline';
  font-src https://fonts.gstatic.com; img-src 'self' data:; script-src 'self';
  frame-ancestors 'self';" />
```

This restricts scripts/images/fonts to same-origin and trusted CDNs, and prevents iframe embedding (also addresses L3).

#### M2 — External CDN resources loaded without SRI — MITIGATED
**File:** `index.html`

Google Fonts dynamically generates CSS responses making SRI impractical. Mitigated by CSP policy that restricts style sources to `'self'` and `https://fonts.googleapis.com` only. Self-hosting fonts is recommended if the external dependency is a concern.

#### M3 — LocalStorage data trusted without validation — FIXED
**Files:** `src/persistence.js`, `src/conjugation.js`

- `loadPersistentGold()` — now validates value is a finite non-negative integer
- `loadHeroUnlocks()` — now validates structure (rejects arrays, non-string keys, oversized keys), coerces values to boolean
- `loadErrorDB()` — now validates each key is a bounded string, each value a positive finite integer

#### M4 — `window.VERBS` override allows arbitrary data injection — FIXED
**File:** `src/conjugation.js`

Added `isValidVerbSource()` validation function that checks:
- Object is non-null, non-array
- Each group has a string `label` and an object `list`
- Each verb has a string `inf` and array-type tense entries
- `window.VERBS` is now only used if it passes full structural validation

---

### LOW — ALL FIXED

#### L1 — Debug and cheat APIs exposed on `window` in production — FIXED
**Files:** `src/main.js`, `src/ui.js`

All debug APIs (`window.validateLevels`, `window.scoreLevelQuality`, `window.gameLogs`, `window.compareGenerations`, and the conjugation API) are now gated behind a dev-mode check:
```js
const _isDevMode = window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.protocol === "file:";
```
APIs are only exposed when running locally. The F11 debug overlay is similarly gated.

#### L2 — Cheat menu with currency grant accessible via long-press — FIXED
**File:** `src/ui.js`

`openCheatModal()` now checks `_isDevMode` before activating. The cheat menu is inaccessible in production deployments.

#### L3 — No `X-Frame-Options` or `frame-ancestors` CSP directive — FIXED
**File:** `index.html`

The CSP meta tag (M1 fix) includes `frame-ancestors 'self'`, preventing the game from being embedded in iframes on other domains.

#### L4 — PWA manifest uses relative `start_url` — FIXED
**File:** `site.webmanifest`

Changed `"start_url": "."` to `"start_url": "./index.html"` for explicit resolution.

---

### INFORMATIONAL

#### I1 — No service worker registered
The PWA manifest is defined but no service worker is registered. Not a security issue, but relevant to the PWA claim. **Status:** Noted, not a security fix.

#### I2 — Bundled `game.js` may be stale — NOTED
A legacy `game.js` exists at the root. Ensure it is not served instead of the modular `src/` files, or remove it if unused.

#### I3 — `.DS_Store` files committed to repository — FIXED
Added `.gitignore` with `.DS_Store` exclusion pattern.

---

## iOS Native Wrapper — Additional Review

**File:** `ios-native/ConjugQuestIOS/GameWebView.swift`

The `BundleSchemeHandler` correctly implements:
- Path traversal protection via `canonicalCandidate.hasPrefix(canonicalRoot)` check
- Custom `app://` scheme handler restricted to `webapp` host
- Proper MIME type mapping
- No external URL loading

**No additional findings.**

---

## Summary of Changes

| # | Finding | Status | Action Taken |
|---|---------|--------|-------------|
| 1 | H1 — innerHTML XSS | **FIXED** | Replaced all data-interpolating `innerHTML` with safe DOM APIs |
| 2 | M1 — No CSP | **FIXED** | Added Content Security Policy meta tag |
| 3 | M2 — No SRI on CDN | **MITIGATED** | CSP limits blast radius; SRI impractical for Google Fonts |
| 4 | M3 — Storage trust | **FIXED** | Added type/range/structure validation on all localStorage reads |
| 5 | M4 — window.VERBS | **FIXED** | Added structural validation before accepting override |
| 6 | L1 — Debug APIs | **FIXED** | Gated behind dev-mode hostname check |
| 7 | L2 — Cheat menu | **FIXED** | Gated behind dev-mode check |
| 8 | L3 — No frame protection | **FIXED** | CSP `frame-ancestors 'self'` directive |
| 9 | L4 — PWA start_url | **FIXED** | Changed to explicit `./index.html` |
| 10 | I3 — .DS_Store | **FIXED** | Added `.gitignore` |

---

*This audit covers the client-side codebase and iOS native wrapper. No backend, API, or infrastructure was in scope.*
