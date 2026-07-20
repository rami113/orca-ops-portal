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
- **Primary vessel blob:** Google Sheets (`SHARED_SHEET_ID`) tab `vessels` — cell A1 stores JSON array.
- **Attachment tags:** Separate Sheet tab `atags` — cell A1 stores JSON object
  `{ "vesselId_attachmentId": {tag,filename,userEmail,ts} }`. Completely independent
  of the vessel blob — no race conditions between users tagging simultaneously.
- **Archive:** Separate Sheet tab `archive` — completed vessels stored as JSON array.
  Loaded on demand only (not on every page load). Never affects vessel blob size.
- **Tag cache (localStorage):** `orca_atags_{vessel.id}` — instant per-device layer.
  Written immediately on every tag change. Sheet is authoritative; localStorage is cache.
- **Vessel fallback:** `localStorage` keys `orca_v3`/`orca_u2` when Sheet unavailable.
- **Blob size guard:** `guardBlobSize()` called before every Sheet write — trims oldest
  timeline entries if JSON exceeds 45KB. Warns at 35KB.
- **Timeline cap:** `trimTimeline()` caps each vessel at `TIMELINE_MAX=50` entries,
  always preserving milestones (sent, status changes, transfers).
- Always call `saveVessels()` after mutating the `vessels` array.
- For tag changes: call `saveSharedAttTag()` to write to atags tab AND `saveVessels()`
  to keep vessel blob in sync. Never rely on vessel blob alone for tag persistence.

### CC Email
- `OPS_CC_EMAIL = 'ops@orca-ai.io'` — CC'd on ALL coordination emails (initial + follow-ups).
- This ensures every ops team member has the full Gmail thread in their own inbox,
  enabling cross-user attachment access after vessel transfers.
- Must be a Google Group with all ops team members as members.

### Global State (app.js top-level `let`)
```
vessels[]   — array of vessel objects (the main data)
user        — signed-in user object {email, name, pic, role}
token       — OAuth2 access token string
ibItems[]   — inbox reply items currently loaded (ONE per vessel, keyed by vi)
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
  lastTransferTo,           // email of last person vessel was transferred to
  lastTransferAt,           // ISO timestamp of last transfer
  emailsSent, emailsReceived,
  lastEmailDate, lastReceivedDate, lastContact, lastActivity,
  firstEmailDate,
  gmailThreadId,            // Gmail thread ID from original sender's account
  receivedItems[],          // keyword-detected items + attachment-tagged items (combined)
  detectedItems[],          // ONLY keyword detection hits from inferReceivedFromReply()
  attachmentTags{},         // { attachmentId: itemLabel } — saved attachment file tags
  attachmentMeta{},         // { attachmentId: {filename, mimeType, size, tag} } — for cross-user display
  missingItems[],           // REQUIRED_ITEMS not yet received
  timeline[],               // array of {ts, type, title, detail, body?, msgId?}
  nextAction,
  followupsSent,
  lastFollowupPreview
}
```

**CRITICAL — detectedItems vs receivedItems:**
- `detectedItems` = ONLY `inferReceivedFromReply()` keyword hits. Never add attachment
  tags here. Never use inverse-of-missing.
- `receivedItems` = `detectedItems` union `attachmentTags` values (computed on save).
- `attachmentTags` = what ops manually tagged via the file tag dropdown.
- The View modal computes received live: keyword hits on latest ibItem body + `attachmentTags`.

**CRITICAL — ibItems matching:**
- Always match ibItems to vessels by `item.vi === vesselIdx` (vessel index).
- NEVER match by captain email — two vessels can share the same captain email address,
  causing the wrong ibItem to be returned.

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
- ESC key closes any open modal — handled by a global `keydown` listener at the bottom of `app.js`.

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
- ALL coordination emails (initial + follow-ups) CC `OPS_CC_EMAIL`. Do not remove this.
- All follow-up sends pass `vessel.gmailThreadId` to `sendGmail()` to stay in the same thread.

### Analysis Pipeline (do not break this order)
1. `cleanCaptainReplyText(body)` — strip quoted chain from reply
2. `inferReceivedFromReply(cleanedBody)` → `received[]` (keyword matching only)
3. Merge attachment auto-tags from `curIb.attachments` into received
4. `normalizeAnalysisResult(vessel, cleanedBody, analysis)` — reconciles received/missing
5. Overwrite `analysis.followup_email` with `buildFollowupEmail({...v, receivedItems: analysis.received}, analysis.missing)`
6. Save: `detectedItems` = keyword hits only; `receivedItems` = keyword hits + attachment tags

### itemKey() Canonical Keys
Used for deduplication — any item string maps to one of these keys:
`vessel_ga`, `bridge_ga`, `ports`, `cable`, `vsat`, `power`, `monitor`, `seapod`, `docs`

---

## Gmail / Inbox Rules
- **One ibItem per vessel** — `fetchInboxByThreads` builds exactly ONE inbox item per vessel
  using the latest captain message and ALL attachments accumulated across all replies.
- Inbox fetch uses `vessel.gmailThreadId` first. If that fails (e.g. after transfer to a
  different Gmail account), falls back to subject-line search in the current user's Gmail.
- Captain replies identified by: `from` header does NOT contain `"ORCA AI OPS"`.
- `sheetsInboxSave()` writes new replies to the shared inbox sheet for cross-user visibility.
- Status is NEVER auto-changed by inbox check — only `runIbAnalysis` and `setVesselStatus` change status.
- **Known limitation:** Vessels created before `gmailThreadId` was introduced have no
  thread ID and will fall back to subject search. Only vessels created through the portal
  get a `gmailThreadId`.

---

## Attachment System

### extractAttachments(payload, msgId)
- Walks the Gmail MIME payload tree recursively.
- Skips files named `"Orca AI"` (our logo embedded in outbound HTML emails) — by filename only.
- Does NOT filter by `Content-Disposition` or `Content-ID`. Gmail marks inline-pasted images
  as `Content-Disposition: inline` in CC recipients' mailboxes but not in the sender's —
  filtering by disposition causes cross-user inconsistency where sender sees a file but
  recipients don't. Filename-only filtering is the correct approach.
- Returns `[{filename, mimeType, attachmentId, msgId, size}]`.

### autoTagFromFilename(filename)
- Maps filename keywords to REQUIRED_ITEMS strings.
- GA/general arrangement → Vessel GA or Bridge Console GA.
- Never stored in `attachmentTags` — computed at render time only.

### Tag Persistence (three-layer)
1. **localStorage** (`orca_atags_{vessel.id}`) — instant, synchronous, per-device.
2. **`vessel.attachmentTags`** in memory — current session.
3. **Google Sheet** — async, cross-device, cross-user.
- `_saveAttTagsLocal()` / `_loadAttTagsLocal()` handle the localStorage layer.
- `restoreAttachmentTags()` merges all three sources (Sheet wins conflicts).
- `onAttachTag()` writes to localStorage immediately, then calls `saveVessels()` async.
- DO NOT add attachment tags to `detectedItems` — `onAttachTag` only updates
  `attachmentTags` and recomputes `receivedItems` = `detectedItems + tag values`.

### attachmentMeta
- Stored on vessel: `{ attachmentId: {filename, mimeType, size, tag} }`.
- Written by `onAttachTag` when a file is tagged.
- Used by the View modal to show file names/tags to users who don't have Gmail access
  to the original thread (e.g. after vessel transfer).

---

## Ownership / Transfer System

### assignVessel(i, email)
- Changes `vessel.assignedTo`, updates `lastActivity`, adds timeline entry.
- Sends branded HTML notification email to new owner FROM the logged-in user's Gmail.
- Email includes: vessel summary, missing/received items, latest captain reply body + filenames.

### transferOwnership(idx)
- Full modal flow with confirmation — same notification email as `assignVessel`.
- Sets `lastTransferTo` and `lastTransferAt` on vessel (shown as badge in table for 3 days).

### Live Transfer Updates (pollVessels)
- `assignedTo` is intentionally NOT in the poll's `keep` object.
- When another user changes ownership and saves to Sheet, the current user's poll picks up
  the new `assignedTo` from the Sheet (svNewer check). This enables live transfer visibility
  without page refresh.
- `assignVessel` and `transferOwnership` both update `lastActivity` so the svNewer check
  correctly identifies the Sheet as newer after a transfer.

### Cross-User Thread Access
- `gmailThreadId` is account-specific — it only works in the original sender's Gmail.
- After transfer, `fetchInboxByThreads` falls back to subject-line search in the new
  owner's Gmail. This works because `OPS_CC_EMAIL` ensures the new owner received all
  emails in CC.
- If captain uses Reply (not Reply All), the new owner won't have the captain's reply
  in their Gmail. This is a known Gmail limitation.

---

## Smart Polling
- **Inbox poll: every 5s** when tab is active, stops when tab is hidden.
- **Vessel poll: every 8s** — silently merges Sheet data into local state.
- `_renderTableImpl` skips re-render if a `<select>` or `<input>` inside the table is
  focused — prevents dropdown collapse while user is editing.
- Inbox badge (`ib-count`) is never reset mid-fetch — only updated after fetch completes
  to prevent visible flicker.
- `pollVessels` preserves local: `status`, `risk`, `progress`, `missingItems`,
  `receivedItems`, `detectedItems`, `attachmentTags`.
- `pollVessels` takes from Sheet when newer: `timeline`, `emailsReceived`,
  `lastReceivedDate`, `lastActivity`, `assignedTo`.

---

## AI Analysis — Current Status
The "Analyze" button sends a prompt to `https://api.anthropic.com/v1/messages` but there
is **no API key configured** — the request fails silently and the `catch` block takes over.
The app therefore runs **entirely on keyword-based analysis** via `inferReceivedFromReply()`.
This is the intended behaviour for now. Do NOT add an API key directly in browser code
(security risk). If AI is added in the future it must go through a server-side proxy
(e.g. a Vercel serverless function) so the key is never exposed to the browser.

---

## UI / Modal Rules
- All modals have an X button in the top-right header AND a Close button at the bottom.
- ESC key closes any open modal (global `keydown` handler at bottom of `app.js`).
- For `orca-modal-overlay` (custom alert/confirm), ESC triggers Cancel if available, else OK.
- Modal IDs: `mod-start`, `mod-ib`, `mod-view`, `mod-view-reply`, `mod-latest-status`.
- Reply Age column uses `lastReceivedDate` (captain's last reply date), NOT `lastContact`.
- `lastContact` = last time ops sent an email or ran analysis (used for traffic light).
- `lastActivity` = last real email event (send/receive). NOT updated by tag saves, analyze runs,
  or other non-email actions.

---

## Current Development Focus
This codebase is in active stabilization — the priority is **bug fixes and small features**
to reach a solid, production-ready base. Do not introduce large refactors or architectural
changes. Every change should be minimal, targeted, and not break existing behaviour.
When in doubt, fix the bug conservatively and document it in the Recent Fix Log below.

---

## Deployment
- **Repo:** https://github.com/rami113/orca-ops-portal
- **Branch:** `main` — used for testing. Vercel auto-deploys on every push to `main`.
- **Force push is allowed** on `main` since it is a testing branch.
- To deploy: commit changes locally → `git push origin main` (or `--force` if needed).
- **AGENTS.md is gitignored** — never push it to the repo. Copy it between computers manually
  or via the `/share` link from an OpenCode session.

---

## What NOT to Do
- Do not add a backend/server — this is intentionally a fully static app.
- Do not add npm, webpack, or any build tooling.
- Do not use `v.receivedItems` as a source for computing `missing` — use `v.detectedItems`.
- Do not add attachment tags to `detectedItems` — only keyword hits go there.
- Do not match ibItems to vessels by captain email — use vessel index (`vi`) only.
- Do not call `alert()` or `confirm()` — use `orcaAlert()` / `orcaConfirm()`.
- Do not push secrets (API keys, OAuth secrets) to the repo.
- Do not push `AGENTS.md` to the repo — it is gitignored.
- Do not change `REQUIRED_ITEMS` without also updating `itemKey()` and `hasItem()`.
- Do not re-enable the old subject+email inbox search (the commented-out block in `fetchInbox`).
- Do not introduce large refactors — keep changes small and targeted.
- Do not update `lastActivity` on tag saves, status changes, or analysis runs — only on email events.
- Do not remove `OPS_CC_EMAIL` from send calls — cross-user thread access depends on it.
- Do not auto-change vessel status in `updateReceivedStatsFromInbox` — status is user-controlled.

---

## Recent Fix Log

**Session — Jul 2026 (first session)**
- Bug: Follow-up email "Thank you for providing" section incorrectly listed items the
  captain never sent.
- Root cause: `receivedItems` stored as inverse-of-missing. Fixed by introducing
  `detectedItems` field — keyword hits only. `normalizeAnalysisResult` now uses
  `v.detectedItems`. All four save sites updated.
- Also tightened `inferReceivedFromReply`: port calls require `strictAttach`,
  VSAT routing requires `strictAttach`, `hereAre` requires item keyword.

**Phase 1 — Jul 2026 (storage architecture overhaul)**
- Added `atags` Sheet tab: all attachment tags stored independently of vessel blob.
  `saveSharedAttTag()` / `loadSharedAttTags()` / `_applySharedAttTagsToVessels()`.
  Tags refresh every 30s via poll. All users share same tag data with no race conditions.
- Added `archive` Sheet tab: completed vessels moved here via Archive button in View modal
  (admin only, visible when status=completed). `archiveVessel()` / `loadArchivedVessels()`.
- Added `guardBlobSize()`: checks JSON size before every Sheet write, trims oldest
  timeline entries progressively to stay under 45KB cell limit.
- Added `trimTimeline()`: caps vessel timeline at `TIMELINE_MAX=50`, preserves milestones.
- Tag save is now 3-layer: localStorage (instant) → atags Sheet tab (shared) → vessel blob (cache).
- `ensureSheetTab()`: generic function to create a Sheet tab if it doesn't exist yet.

**Session — Jul 2026 (second session)**
- Added full attachment system: `extractAttachments`, `autoTagFromFilename`,
  `renderAttachmentsPanel`, tag dropdown with persistence, preview/download buttons.
- Fixed attachment filter: only skip files with explicit `Content-Disposition: inline`
  (not all Content-ID files — Gmail assigns Content-IDs to normal attachments too).
- Fixed ibItem matching: use vessel index only, never captain email (two vessels can
  share the same captain address causing wrong ibItem to be returned).
- Fixed follow-up draft: `openAnalyzeResultModal` now uses `result.received` only,
  never merges stale `v.receivedItems`. Draft always matches the Received panel.
- Fixed tag change: recompute received from `curIb.attachments` live (a.tag + autoTagFromFilename)
  so changing a tag correctly removes the old one and keeps auto-tagged files.
- Fixed status revert: removed forced `status='followup'` from `updateReceivedStatsFromInbox`.
  Status is now user-controlled only.
- Fixed dropdown collapse: `_renderTableImpl` skips re-render when a select/input is focused.
- Fixed inbox badge flicker: badge not reset mid-fetch, only updated after fetch completes.
- Fixed Reply Age column: uses `lastReceivedDate` not `lastContact`.
- Fixed live transfer: `assignedTo` removed from poll `keep` so remote ownership changes
  propagate immediately. Both `assignVessel` and `transferOwnership` update `lastActivity`.
- Added `assignVessel` notification email (same template as transferOwnership) with latest
  captain reply body + attachment filenames embedded.
- Added `OPS_CC_EMAIL = 'ops@orca-ai.io'` CC on all coordination emails for cross-user access.
- Added Gmail thread continuation: all follow-up sends pass `vessel.gmailThreadId` so
  emails stay in the same thread.
- Added subject-line fallback in `fetchInboxByThreads` when thread not in current user's
  Gmail (enables Jacob to see threads after vessel is transferred to him).
- Added ESC key and X button to all modals.
- Added `attachmentMeta` on vessel for cross-user file visibility in View modal.
- Added localStorage backup for attachment tags (`orca_atags_{vessel.id}`) — instant,
  synchronous layer so tags survive modal reopen without async Sheet dependency.
- Added `_buildLatestReplyBlock()` — embeds latest captain reply in transfer/assign emails.
- Smart polling: 5s inbox, 8s vessels, pauses when tab hidden, resumes immediately on focus.
