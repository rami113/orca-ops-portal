# Orca Ops Portal — Agent Context

## Project Overview
Internal single-page web app for Orca AI operations team to coordinate vessel hardware
(Orca AI system) installations. Tracks vessel readiness, manages Gmail communication with
ship masters (captains), and uses keyword analysis + AI to parse replies and generate
follow-up emails.

**Stack:** Vanilla HTML / CSS / JS — no build system, no npm, no bundler.
**Deploy:** Vercel static hosting (`vercel.json`).
**Files:** `index.html`, `app.js`, `style.css`, `logo.png`, `vercel.json`, `AGENTS.md`.

---

## Build / Lint / Test Commands
There are **no build steps, no package manager, no test suite**.
- Open `index.html` directly in a browser for local development.
- Deploy by pushing to the `main` branch on GitHub — Vercel auto-deploys.
- No linting config exists. Validate JS manually in the browser DevTools console.
- Version is tracked manually: bump `ORCA_FIX_VERSION` in `app.js` line 13 and the
  comment in `index.html` line 4 for every release.

---

## Architecture & Key Constants

### Auth
- Google Identity Services (GSI) OAuth2, scopes: Gmail send + readonly + Sheets + profile.
- Only `@orca-ai.io` accounts are allowed (enforced in `onSignIn`).
- Token stored in `sessionStorage` via `saveSession()` / `loadSession()`.

### Roles
- `SUPER_ADMINS` — full access, DB reset, see all vessels (`rami@orca-ai.io`)
- `ADMIN_L2` — admin panel, delete vessels (named team list in `app.js`)
- `User` — standard access, own assigned vessels only

### Storage
- **Primary:** Google Sheets (`SHARED_SHEET_ID`) — single cell A1 stores JSON blob.
- **Fallback:** `localStorage` key `orca_v3` for vessels, `orca_u2` for user.
- Always call `saveVessels()` after mutating the `vessels` array.

### Global State (app.js top-level `let`)
```
vessels[]   — array of vessel objects (the main data)
user        — signed-in user object {email, name, pic, role}
token       — OAuth2 access token string
ibItems[]   — inbox reply items currently loaded
curIb       — the inbox item currently open in the analyze modal
ibAna       — AI/keyword analysis result for curIb
ana         — analysis result for the manual Analyze tab
draft       — email draft string for the Start Coordination modal
```

### Required Checklist Items (REQUIRED_ITEMS)
These 9 items are tracked per vessel. Never add/remove without updating `itemKey()`:
1. Vessel GA
2. Bridge Console GA
3. Next 2–3 upcoming port calls + corresponding agent details for each port
4. Cable penetration
5. VSAT routing
6. Power connection
7. Proposed monitor location photos
8. Proposed Seapod location photos
9. Docs acknowledgement

---

## Vessel Data Model
```js
{
  id, name, email,          // vessel identity
  owner, fleet, docs,       // metadata
  status,                   // 'waiting'|'followup'|'ready'|'scheduled'|'completed'
  risk,                     // 'low'|'medium'|'high'
  progress,                 // 0-100 number
  assignedTo,               // ops team member email
  emailsSent, emailsReceived,
  lastEmailDate, lastReceivedDate, lastContact, lastActivity,
  firstEmailDate,
  gmailThreadId,            // Gmail thread ID — critical for inbox matching
  receivedItems[],          // items explicitly detected in captain replies
  detectedItems[],          // same as receivedItems — source of truth, never inverse-of-missing
  missingItems[],           // REQUIRED_ITEMS not yet received
  timeline[],               // array of {ts, type, title, detail, body?, msgId?}
  nextAction,
  followupsSent,
  lastFollowupPreview
}
```

**CRITICAL:** `receivedItems` and `detectedItems` must ONLY be populated from
`inferReceivedFromReply()` keyword hits — NEVER as the inverse of `missingItems`.
Setting `receivedItems = REQUIRED_ITEMS.filter(not in missing)` is the bug that was
fixed — do not reintroduce it.

---

## Code Style Guidelines

### General
- Pure ES2020+ vanilla JS. No TypeScript, no JSX, no frameworks.
- No `import`/`export` — everything is global scope in `app.js`.
- Semicolons required. Single quotes for strings.
- Compact, dense style is acceptable for one-liners (existing code uses this heavily).
- Prefer `const`; use `let` only when reassignment is needed. Never `var`.

### Naming Conventions
- Functions: `camelCase` — e.g. `buildFollowupEmail`, `inferReceivedFromReply`
- DOM element IDs: `kebab-case` — e.g. `mod-ib`, `mib-fu`, `btn-snd`
- Constants: `UPPER_SNAKE_CASE` — e.g. `REQUIRED_ITEMS`, `SHARED_SHEET_ID`
- Vessel index variable: always `idx` or `i`, never `index`
- Temp/private variables inside functions: prefix with `_` — e.g. `_idx`, `_newDet`

### DOM Manipulation
- Use `document.getElementById()` — never `querySelector` for ID lookups.
- Always null-check before accessing: `const el = document.getElementById('x'); if(el)...`
- Use `innerHTML` only with `escapeHtml()` sanitization for user-derived content.
- Modal show/hide: set `.style.display = 'flex'` (modals) or `'block'`/`'none'`.

### Async / Error Handling
- All Gmail and Sheets API calls are `async/await` with `try/catch`.
- On API failure: log with `console.error`, show user-facing message via `orcaAlert()`.
- Never use `alert()` or `confirm()` — use `orcaAlert()` / `orcaConfirm()` (Promise-based).
- Always `await new Promise(r => setTimeout(r, 0))` before heavy work to unblock UI.
- Token expiry: handled by `scheduleTokenRefresh()` — do not re-implement.

### Email Generation
- Initial outbound emails: `buildHtmlEmail()` — uses the full branded HTML template.
- Follow-up emails: `buildFollowupHtmlEmail()` — simpler wrapper, never use the initial template.
- Plain-text drafts: `buildFollowupEmail(vessel, missingItems[])` — used for textarea display.
- Subject format for coordination emails: `"Orca AI Installation Coordination - {vesselName}"`
- Reply subject format: `"Re: Orca AI Installation Coordination - {vesselName}"`

### Analysis Pipeline (do not break this order)
1. `cleanCaptainReplyText(body)` — strip quoted chain from reply
2. `inferReceivedFromReply(cleanedBody)` → `received[]` (keyword matching only)
3. `normalizeAnalysisResult(vessel, cleanedBody, analysis)` — reconciles received/missing
4. Overwrite `analysis.followup_email` with `buildFollowupEmail({...v, receivedItems: analysis.received}, analysis.missing)`
5. Save: set `detectedItems` and `receivedItems` to accumulated detections only

### itemKey() Canonical Keys
Used for deduplication — any item string maps to one of these keys:
`vessel_ga`, `bridge_ga`, `ports`, `cable`, `vsat`, `power`, `monitor`, `seapod`, `docs`

---

## Gmail / Inbox Rules
- Inbox fetch uses **thread-based** matching (`fetchInboxByThreads`) for vessels with
  `gmailThreadId` — this is the only reliable method. The old subject+email search is
  commented out and must stay disabled.
- Captain replies are identified by: `from` header does NOT contain `"ORCA AI OPS"`.
- Never add inbox items without a matching vessel in the `vessels` array.
- `sheetsInboxSave()` writes new replies to the shared inbox sheet for cross-user visibility.

---

## What NOT to Do
- Do not add a backend/server — this is intentionally a fully static app.
- Do not add npm, webpack, or any build tooling.
- Do not use `v.receivedItems` as a source for computing `missing` — use `v.detectedItems`.
- Do not call `alert()` or `confirm()` — use `orcaAlert()` / `orcaConfirm()`.
- Do not push secrets (API keys, OAuth secrets) to the repo.
- Do not change `REQUIRED_ITEMS` without also updating `itemKey()` and `hasItem()`.
- Do not re-enable the old subject+email inbox search (the commented-out block in `fetchInbox`).

---

## Recent Fix Log
**Session — Jul 2026**
- Bug: Follow-up email "Thank you for providing" section incorrectly listed items the
  captain never sent (Port calls, Cable, VSAT, Monitor photos, Seapod photos).
- Root cause: `receivedItems` was stored as `REQUIRED_ITEMS minus missing` (inverse).
  On next analyze, `normalizeAnalysisResult` merged these stale items as if they were
  confirmed, removing them from `missing` and listing them in the "Thank you" section.
- Fix: Introduced `detectedItems` field — accumulates only `inferReceivedFromReply()`
  hits. `normalizeAnalysisResult` now uses `v.detectedItems` (not `v.receivedItems`)
  to compute the missing list. All four save sites updated: `runIbAnalysis`,
  `sendIbFollowUp`, `saveAnalyzeOnly`, `saveAndSend`.
- Also tightened `inferReceivedFromReply`: port calls now require `strictAttach`,
  VSAT routing requires `strictAttach`, generic `hereAre` signal requires an item
  keyword to count as an attachment signal.
