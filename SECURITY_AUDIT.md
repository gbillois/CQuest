# Security Audit Report — ConjugQuest

**Date:** 2026-03-14
**Scope:** Full client-side codebase (`index.html`, `src/*.js`, configuration files)
**Risk context:** Client-side browser game with no backend, no authentication, no user accounts. Attack surface is limited to the local browser environment.

---

## Executive Summary

ConjugQuest is a client-side-only educational platformer game with no backend, no authentication, and no sensitive data processing. The overall security posture is **reasonable for its threat model**, but there are several findings that should be addressed to follow web security best practices and harden against potential hosting-environment risks.

**Critical:** 0
**High:** 1
**Medium:** 4
**Low:** 4
**Informational:** 3

---

## Findings

### HIGH

#### H1 — DOM-based XSS via `innerHTML` with interpolated data
**Files:** `src/ui.js:74-99`, `src/ui.js:1044-1056`, `src/ui.js:1151`, `src/conjugation.js:314-322`

Multiple locations use `.innerHTML` with template literals that interpolate application data:

```js
// ui.js:89 — hero.sprite.idleSE and hero.name are interpolated into HTML
`<img src="${hero.sprite.idleSE}" alt="${hero.name}" loading="lazy" />`

// ui.js:93 — hero.name directly interpolated
`<div class="hero-shop-name">${hero.name}</div>`

// ui.js:1151 — verb infinitive and pronoun interpolated
ui.questionPrompt.innerHTML = `Conjugue <span class="verb">${inf}</span> ...`

// conjugation.js:320 — error entries interpolated
`<strong>${pronouns[entry.pronIdx]} + ${entry.infinitive}</strong>`
```

**Risk:** While the data currently comes from hardcoded verb tables and asset config (not user input), this pattern is fragile. If the verb source is ever loaded from an external API or if `window.VERBS` is set by a third-party script (see `conjugation.js:5-6`), this becomes exploitable XSS. The `window.VERBS` override path (`conjugation.js:5`) specifically accepts arbitrary external data that flows directly into `innerHTML`.

**Recommendation:** Use `textContent` for plain text, and `document.createElement()` for structured content. At minimum, sanitize any externally-sourced strings before interpolation. Replace `innerHTML` assignments with safe DOM APIs where possible.

---

### MEDIUM

#### M1 — No Content Security Policy (CSP)
**File:** `index.html`

The page has no `<meta http-equiv="Content-Security-Policy">` header or equivalent. This means:
- No restrictions on inline scripts (though none are currently used)
- No restrictions on which domains can serve scripts, styles, or images
- No protection against script injection if the hosting environment is compromised

**Recommendation:** Add a CSP meta tag. A reasonable starting policy:
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src 'self' data:; script-src 'self';" />
```

#### M2 — External CDN resources loaded without Subresource Integrity (SRI)
**File:** `index.html:13-16`

Google Fonts CSS is loaded from `fonts.googleapis.com` without `integrity` or `crossorigin` attributes:
```html
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Nunito:wght@600;700;800&display=swap" rel="stylesheet" />
```

**Risk:** If the CDN is compromised, malicious CSS (or JS via CSS injection vectors) could be served. Note: Google Fonts dynamically generates CSS responses, making SRI impractical for this specific resource. However, the lack of CSP (M1) compounds this risk.

**Recommendation:** Consider self-hosting the fonts to eliminate the external dependency, or ensure CSP is in place to limit the blast radius.

#### M3 — LocalStorage data is trusted without validation on read
**File:** `src/persistence.js`, `src/conjugation.js:238-246`

Stored values are parsed and used with minimal validation:
```js
// persistence.js:41 — JSON.parse of raw localStorage
const parsed = raw ? JSON.parse(raw) : {};
return parsed && typeof parsed === "object" ? parsed : {};

// conjugation.js:242 — Same pattern for error DB
const parsed = JSON.parse(raw);
```

**Risk:** LocalStorage can be manipulated by any script on the same origin (including browser extensions, XSS on sibling pages if hosted on a shared domain, or devtools). A crafted `heroUnlocks` value could unlock all heroes without paying. A crafted `cquest_gold` value could grant unlimited currency.

**Impact:** Low for a single-player educational game, but relevant if any competitive or progression-tracking features are added.

**Recommendation:** For the current single-player context, add schema validation (check expected types, ranges). If progression integrity ever matters, consider signed/hashed storage or server-side validation.

#### M4 — `window.VERBS` override allows arbitrary data injection
**File:** `src/conjugation.js:5-6`

```js
if (window.VERBS && typeof window.VERBS === "object") {
    return window.VERBS;
}
```

Any script on the page (or browser extension) can set `window.VERBS` before the game initializes, replacing the entire verb database. This data flows into `innerHTML` (H1) and the question generation system.

**Recommendation:** Remove the `window.VERBS` override or validate the structure rigorously before use.

---

### LOW

#### L1 — Debug and cheat APIs exposed on `window` in production
**Files:** `src/main.js:158-160`, `src/main.js:171-202`, `src/ui.js:1234-1243`

Multiple internal APIs are exposed globally:
```js
window.validateLevels = validateAllLevels;
window.scoreLevelQuality = scoreLevelQuality;
window.gameLogs = { dump, get, clear, setLevel };
window.compareGenerations = ...;
window.openQuestion = openQuestion;
window.makeQuestion = makeQuestion;
window.answerClick = answerClick;
// ... etc
```

**Risk:** Players can call `window.answerClick(correctAnswer)` to auto-solve conjugation questions, or use debug tools to manipulate game state. The cheat menu (index.html:158-192) includes "Give 999 pieces" functionality.

**Impact:** Low — this is a single-player educational game and cheating primarily hurts the learner.

**Recommendation:** Gate debug APIs behind a build flag or development mode check. Consider removing `exposeConjugationApi()` in production builds.

#### L2 — Cheat menu with currency grant accessible via long-press
**Files:** `index.html:158-192`, `src/ui.js` (cheat menu binding)

A hidden cheat menu is accessible via long-press that allows granting 999 gold pieces, changing difficulty, and selecting any level.

**Impact:** Same as L1 — low for a single-player game.

**Recommendation:** Consider removing or gating behind a dev flag for production.

#### L3 — No `X-Frame-Options` or `frame-ancestors` CSP directive
**File:** `index.html`

The game can be embedded in an iframe on any domain, enabling potential clickjacking.

**Recommendation:** Add `frame-ancestors 'self'` to the CSP (M1), or add:
```html
<meta http-equiv="X-Frame-Options" content="SAMEORIGIN" />
```

#### L4 — PWA manifest uses relative `start_url`
**File:** `site.webmanifest:6`

```json
"start_url": "."
```

**Risk:** Minimal, but a relative start URL could theoretically resolve to an unexpected page if the manifest is served from an unexpected path.

**Recommendation:** Use an absolute path like `"/index.html"`.

---

### INFORMATIONAL

#### I1 — No service worker registered
The PWA manifest is defined but no service worker is registered. This means the app won't work offline despite being marked as a PWA. Not a security issue, but relevant to the PWA claim.

#### I2 — Bundled `game.js` may be stale
A 212KB bundled `game.js` exists at the root alongside the modular `src/` files. If the bundle is served instead of the modules, it may contain outdated code with different behavior.

**Recommendation:** Ensure a clear build process keeps `game.js` in sync, or remove it if unused.

#### I3 — `.DS_Store` files committed to repository
Git history shows `.DS_Store` files were committed (commit `2252ecc`). These can leak directory structure information.

**Recommendation:** Add `.DS_Store` to `.gitignore` and remove from tracking:
```bash
echo ".DS_Store" >> .gitignore
git rm --cached .DS_Store
```

---

## Summary of Recommendations (Priority Order)

| # | Finding | Action |
|---|---------|--------|
| 1 | H1 — innerHTML XSS | Replace `innerHTML` with safe DOM APIs (`textContent`, `createElement`) |
| 2 | M1 — No CSP | Add Content Security Policy meta tag |
| 3 | M4 — window.VERBS | Remove or validate the global override mechanism |
| 4 | M2 — No SRI on CDN | Self-host fonts or add CSP to limit blast radius |
| 5 | M3 — Storage trust | Add schema validation on localStorage reads |
| 6 | L1/L2 — Debug APIs | Gate behind dev mode flag |
| 7 | L3 — No frame protection | Add frame-ancestors CSP or X-Frame-Options |
| 8 | I3 — .DS_Store | Add to .gitignore |

---

*This audit covers the client-side codebase only. No backend, API, or infrastructure was in scope.*
