<p align="center">
  <img src="logo.png" alt="Orca AI Logo" width="200"/>
</p>

<h1 align="center">Orca AI — Ops Portal</h1>

<p align="center">
  Internal coordination tool for managing vessel hardware installations.<br/>
  Built for the Orca AI operations team.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel" />
  <img src="https://img.shields.io/badge/Auth-Google%20OAuth2-blue?logo=google" />
  <img src="https://img.shields.io/badge/Storage-Google%20Sheets-green?logo=googlesheets" />
  <img src="https://img.shields.io/badge/Stack-Vanilla%20JS-yellow?logo=javascript" />
</p>

---

## What is this?

The Orca AI Ops Portal is a single-page internal web app that helps the operations team coordinate the installation of Orca AI hardware systems on vessels (ships).

Each vessel goes through a coordination process where the ops team communicates with the ship master (captain) to collect 9 required items before installation can be scheduled. This tool manages that entire process — from sending the initial email, to tracking replies, to generating follow-up emails — all from one place.

---

## Key Features

### Vessel Tracking
- Full list of vessels with status, readiness %, risk level, and reply age at a glance
- Traffic light indicator (green / yellow / red) per vessel based on response time and progress
- Fleet and status filters, search, and sortable columns
- Assign vessels to specific ops team members

### Gmail Integration
- Send branded initial coordination emails directly from the portal
- Auto-detects captain replies using Gmail thread ID matching (zero false positives)
- One unified inbox per vessel — latest reply shown with all accumulated attachments
- Follow-up emails generated automatically based on what's still missing

### Smart Reply Analysis
- Keyword-based analysis of captain replies — detects which of the 9 required items were sent
- Short-label detection: if the captain replies with just "Vessel GA", it counts
- Attachment filename analysis: a PDF named "General Arrangement" is auto-tagged as Vessel GA
- Manual tag override: ops team can tag any file to any checklist item from the Analyze modal

### Attachment Viewer
- All files from the entire email thread shown in one panel
- Auto-tagged from filename keywords (GA, port schedule, VSAT diagram, etc.)
- Manual tag dropdown for unidentified files — tags persist across sessions
- Inline preview for images (PNG/JPG), download for all file types
- Warnings when GA is mentioned in the reply but no GA file is attached

### Multi-User Collaboration
- All vessel data stored in a shared Google Sheet — accessible by the whole team
- Smart field-level merge on save — prevents one user from overwriting another's changes
- Near real-time sync: vessel data refreshes every 8 seconds when the tab is active
- Inbox checks every 5 seconds when the tab is active, pauses when hidden
- Instant sync when user returns to the tab after being away

### Vessel Transfer
- Transfer a vessel to another ops team member with one click
- New owner receives a branded notification email with:
  - Vessel name, email, readiness %
  - Full list of still-missing items (red)
  - Full list of already-received items (green)
  - Direct link to the portal

### Role-Based Access
| Role | Access |
|---|---|
| **Super Admin** (`rami@orca-ai.io`) | Full access, DB reset, sees all vessels |
| **Admin L2** | Admin panel, delete vessels, sees all vessels |
| **User** | Standard access, own assigned vessels only |

---

## The 9 Required Checklist Items

Every vessel must provide these before installation can proceed:

1. Vessel GA (General Arrangement drawing)
2. Bridge Console GA
3. Next 2–3 upcoming port calls + agent details for each port
4. Cable penetration details
5. VSAT routing diagram
6. Power connection details
7. Proposed monitor location photos
8. Proposed Seapod location photos
9. Docs acknowledgement

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / ES2020+ JavaScript |
| Auth | Google Identity Services (GSI) OAuth2 |
| Email | Gmail API (send + readonly) |
| Database | Google Sheets API (single cell JSON blob) |
| Hosting | Vercel (static) |
| Build system | None — open `index.html` directly |

No npm. No bundler. No framework. No backend.

---

## Architecture

```
Browser (Vanilla JS)
    │
    ├── Google OAuth2 ──────────────► @orca-ai.io accounts only
    │
    ├── Gmail API ──────────────────► Send emails + read threads + attachments
    │
    └── Google Sheets API ──────────► Shared vessel database (JSON in cell A1)
                                       + Shared inbox log (append-only rows)
```

All data lives in one Google Sheet shared with the ops team. Each user authenticates with their own Google account — no shared credentials, no API keys in the browser.

---

## Local Development

No setup required. Just open `index.html` in a browser.

```bash
# Clone the repo
git clone https://github.com/rami113/orca-ops-portal.git
cd orca-ops-portal

# Open directly in browser
open index.html
```

> **Note:** Gmail and Sheets features require a valid `@orca-ai.io` Google account.

---

## Deployment

Deployed automatically via Vercel on every push to `main`.

```bash
git add .
git commit -m "your change"
git push origin main   # Vercel auto-deploys
```

Live URL: **https://orca-ops-portal.vercel.app**

---

## Version

Current version: `v35.11`

Version is tracked manually — bump `ORCA_FIX_VERSION` in `app.js` line 13 and the comment in `index.html` line 4 for every release.

---

## Repository

- **Repo:** https://github.com/rami113/orca-ops-portal
- **Branch `main`:** testing / staging — Vercel auto-deploys from here
- **Force push allowed** on `main` (testing branch)

---

<p align="center">
  Built with ❤️ for the Orca AI Operations Team
</p>
