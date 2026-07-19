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
- **Always run `node -e "new Function(require('fs').readFileSync('app.js','utf8'))"` to
  check for syntax errors before every `git push`.**
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
- `saveVessels()` does a **field-level merge** with the Sheet before writing — it never
  blindly overwrites. Local-owned fields always win; other users' timeline/email counts
  are preserved from Sheet if their `lastActivity` is newer.

### Global State (app.js top-level `let`)
```
vessels[]   — array of vessel objects (the main data)
user        — signed-in user object {email, name, pic, role}
token       — OAuth2 access token string
ibItems[]   — ONE item per vessel (latest reply + all attachments accumulated)
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
  attachmentTags{},         // {attachmentId: REQUIRED_ITEMS string} — persisted tag map
  timeline[],               // array of {ts, type, title, detail, body?, msgId?}
  nextAction,
  followupsSent,
  lastFollowupPreview
}
```

**CRITICAL:** `receivedItems` and `detectedItems` must ONLY be populated from
`inferReceivedFromReply()` keyword hits or `autoTagFromFilename()` attachment hits —
NEVER as the inverse of `missingItems`.

**CRITICAL:** `attachmentTags` is the single source of truth for file tags.
`renderAttachmentsPanel` reads directly from `vessel.attachmentTags` — never from
`att.tag` on the attachment object (which may be stale after poll replacement).

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
1. `cleanCaptainReplyText(body)` — strip quoted chain from reply (`On DATE wrote:` pattern)
2. `inferReceivedFromReply(cleanedBody)` → `received[]` (keyword matching only)
3. `inferReceivedFromAttachments(attachments)` → merge attachment filename detections
4. `normalizeAnalysisResult(vessel, cleanedBody, analysis)` — reconciles received/missing
   using `v.detectedItems` (NOT `v.receivedItems`) to compute missing list
5. Overwrite `analysis.followup_email` with `buildFollowupEmail({...v, receivedItems: analysis.received}, analysis.missing)`
6. Save: set `detectedItems` and `receivedItems` to accumulated detections only

### itemKey() Canonical Keys
Used for deduplication — any item string maps to one of these keys:
`vessel_ga`, `bridge_ga`, `ports`, `cable`, `vsat`, `power`, `monitor`, `seapod`, `docs`

---

## Attachment System

### Key Functions
- `extractAttachments(payload, msgId)` — walks Gmail MIME tree. Skips parts with
  Content-ID that are NOT `Content-Disposition: attachment` (embedded logos). Also
  skips filenames matching `/^orca\s*ai$/i` as safety net.
- `autoTagFromFilename(filename)` — maps filename keywords to REQUIRED_ITEMS string.
  GA/general arrangement → Vessel GA or Bridge Console GA, port/schedule → ports, etc.
- `restoreAttachmentTags(attachments, vesselIdx)` — returns NEW array with tags from
  `vessel.attachmentTags` applied. Never mutates source array.
- `renderAttachmentsPanel(attachments, bodyText, vesselIdx)` — reads `_savedTags` from
  `vessel.attachmentTags` directly. Uses `_savedTags[att.attachmentId]` as source of
  truth for dropdown pre-selection, background color, labels, and untagged warning.
- `onAttachTag(sel, attachmentId, vesselIdx)` — saves tag to `vessel.attachmentTags`,
  calls `saveVessels()`, updates `detectedItems`/`receivedItems`, refreshes modal panels.

### Tag Dropdown Options
`— Untagged —`, then all 9 REQUIRED_ITEMS, then `Other / Not a required item`.
"Other" is a valid tag that dismisses the untagged warning without marking any checklist item.

### Warnings
- GA mentioned in text but no GA file attached → warning shown
- Attachment signal words in text but no files found → warning shown
- Files present but unidentified (no auto-tag, no manual tag) → warning shown
- Warning before send: `sendIbFollowUp` and `sendFromViewModal` both check
  `vessel.attachmentTags` for untagged files and show `orcaConfirm` before proceeding.

### ibItems Structure
- **One ibItem per vessel** — always the latest reply with ALL attachments from ALL
  replies accumulated and deduped by `attachmentId`.
- `fetchInboxByThreads` collects all captain messages per thread, then builds/updates
  ONE ibItem after the loop. Tags from `vessel.attachmentTags` are restored on each
  fetch cycle so tags survive poll replacement.
- `ibItems[x].attachments` is replaced entirely on every fetch — do NOT rely on
  `att.tag` being persistent. Always use `vessel.attachmentTags` as the source of truth.

---

## Gmail / Inbox Rules
- Inbox fetch uses **thread-based** matching (`fetchInboxByThreads`) for vessels with
  `gmailThreadId` — this is the only reliable method. The old subject+email search is
  commented out and must stay disabled.
- Captain replies are identified by: `from` header does NOT contain `"ORCA AI OPS"`.
- `mergeSharedInbox()` skips items with empty body after `cleanCaptainReplyText` (quoted
  chain only) — prevents stale duplicates from the shared sheet.
- **Known limitation:** Vessels without `gmailThreadId` (created before the feature) will
  NOT receive inbox reply matching.

---

## Smart Polling (real-time sync)
The polling IIFE at the bottom of `app.js`:
- **Inbox poll every 5s** — calls `checkInbox(true)` when tab is visible
- **Vessel poll every 8s** — silently reads Sheet, merges into local state.
  `keep` object in `pollVessels` preserves: `status`, `risk`, `progress`, `assignedTo`,
  `missingItems`, `receivedItems`, `detectedItems`, `attachmentTags`
- **Pauses completely** when tab is hidden — zero API calls wasted
- **Immediate sync** when user returns to tab
- Starts automatically once `token` is set after sign-in

---

## Multi-User Safety
- `saveVessels()` reads Sheet → field-level merge → writes Sheet.
- Local-owned fields (status, progress, items, tags) always win over Sheet version.
- Sheet-owned fields (timeline, emailsReceived, lastActivity) taken from Sheet only
  when Sheet `lastActivity` is newer than local.
- Timelines are merged as union deduped by `ts+type+title`.
- `window._deletedVesselIds` prevents merge from re-adding deleted vessels.

---

## Transfer Notification
`transferOwnership(idx)` sends a branded HTML email to the new assignee containing:
vessel name, email, readiness %, previous coordinator, missing items (red), received
items (green), and a direct link to the portal.

---

## AI Analysis — Current Status
The "Analyze" button calls `https://api.anthropic.com/v1/messages` with no API key —
always fails, `catch` block fires, app falls back to keyword matching. This is intentional.
Do NOT add an API key in browser code. If AI is added later, route through a Vercel
serverless function so the key is never exposed to the browser.

---

## Deployment
- **Repo:** https://github.com/rami113/orca-ops-portal (public — do not commit secrets)
- **Branch:** `main` — Vercel auto-deploys on every push.
- **Force push is allowed** on `main` (testing branch).
- To deploy: `git add . && git commit -m "msg" && git push origin main`

---

## What NOT to Do
- Do not add a backend/server — intentionally fully static.
- Do not add npm, webpack, or any build tooling.
- Do not use `v.receivedItems` to compute `missing` — use `v.detectedItems`.
- Do not use `att.tag` as the tag source of truth — use `vessel.attachmentTags`.
- Do not call `alert()` or `confirm()` — use `orcaAlert()` / `orcaConfirm()`.
- Do not push secrets (API keys, OAuth secrets) to the repo.
- Do not change `REQUIRED_ITEMS` without also updating `itemKey()` and `hasItem()`.
- Do not re-enable the old subject+email inbox search (commented-out block in `fetchInbox`).
- Do not introduce large refactors — keep changes small and targeted.
- Always run the syntax check (`node -e "new Function(...)"`) before pushing.

---

## Recent Fix Log

**Session — Jul 2026 (Part 1)**
- Bug: Follow-up email "Thank you" section listed items captain never sent.
- Fix: Introduced `detectedItems` — accumulates only `inferReceivedFromReply()` hits.
  `normalizeAnalysisResult` uses `v.detectedItems` not `v.receivedItems` to compute missing.
  All four save sites updated: `runIbAnalysis`, `sendIbFollowUp`, `saveAnalyzeOnly`, `saveAndSend`.
- Also tightened `inferReceivedFromReply`: port calls and VSAT require `strictAttach`.
  Added `isShortLabel` detection for captain replies that are just the item name.

**Session — Jul 2026 (Part 2)**
- Feature: Full attachment system — extract, classify, auto-tag, preview, download.
- `extractAttachments()`: walks Gmail MIME payload, skips embedded assets (Content-ID
  + not attachment disposition), skips Orca AI logo by filename.
- `autoTagFromFilename()`: maps GA, port, cable, VSAT, power, monitor, seapod, docs
  keywords in filename to REQUIRED_ITEMS.
- `renderAttachmentsPanel()`: file cards with Tag dropdown, warnings, inline preview.
- `onAttachTag()`: saves to `vessel.attachmentTags`, updates detectedItems, refreshes panels.
- Tag dropdown: includes "Other / Not a required item" to dismiss untagged warning.
- Warning before send: both send functions check for untagged files via `orcaConfirm`.
- One ibItem per vessel: `fetchInboxByThreads` builds one item per vessel with latest
  reply text and all attachments from all replies accumulated.
- `vessel.attachmentTags` is the persistent source of truth for tags — survives poll
  replacement, modal re-opens, hard refresh, and cross-session.
- `renderAttachmentsPanel` reads `_savedTags` directly from `vessel.attachmentTags`.

**Session — Jul 2026 (Part 3)**
- Feature: Smart polling — replaced 30s timer with 5s inbox + 8s vessel poll, pauses
  when tab hidden, immediate sync on tab return.
- Feature: Field-level merge in `saveVessels()` — prevents overwriting other users' changes.
- Feature: Transfer notification — branded HTML email to new vessel assignee.
- Feature: `pollVessels()` silently merges Sheet changes, preserves local edits including
  `attachmentTags`.
- Fix: Duplicate inbox items from quoted reply chains — `mergeSharedInbox` and
  `fetchInboxByThreads` both filter empty-body items.
- Fix: `cleanCaptainReplyText` regex updated to catch `On DATE wrote:` at start of string.
