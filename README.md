# Vis Det – Impact Journal

Vis Det – Impact Journal is a local-first web prototype for structured impact documentation, built with HTML, CSS, JavaScript and IndexedDB.

## Why This Exists

Social-impact work often starts as workshops, mentoring sessions, local meetings and follow-up conversations long before it becomes formal reporting. Vis Det explores how small teams can document early evidence, track people reached, collect lightweight feedback and prepare a clearer impact narrative without setting up a backend.

The prototype is inspired by Norge Unlimited's work with local social entrepreneurship and neighbourhood-based impact documentation. It is not an official production system.

## Features

- Project-based impact journals
- People reached counts, tags and evidence attachments
- Search and date filtering for journal entries
- Rich demo data across January 2025 to June 2026
- Lightweight survey builder
- Standalone survey HTML export
- QR code generation for hosted survey files
- Survey response JSON import
- Impact Summary Draft generated from local project data
- Copyable markdown summary and AI-ready prompt
- Local JSON import/export for backup and portability

## Tech Stack

- Plain HTML
- CSS with custom properties
- Vanilla JavaScript
- Dexie.js and IndexedDB for local-first storage
- QRCode.js for QR generation

No React, Vite, TypeScript, Tailwind, backend or real AI API is used.

## Local-First Architecture

Data is stored in the user's browser using IndexedDB through Dexie.js.

Core local data objects:

- `projects`
- `entries`
- `attachments`
- `surveys`
- `responses`

Export/import uses JSON so the data can be moved or backed up manually. A production version would need backend sync, authentication, role-based access and stronger file storage.

## Demo Data

When the database is empty, the app seeds a realistic demo dataset once using `localStorage` key `visdetDemoSeeded`.

The main demo project is `Nabolagets kraft`, covering January 2025 to June 2026 with:

- 20+ journal entries
- People reached totals in a realistic reporting range
- Tags such as `workshop`, `ungdom`, `mentor`, `nabolag`, `partnerskap`, `effektmåling`, `læring` and `rapportering`
- Sample evidence attachment filenames
- Multiple surveys and imported demo responses

Existing user data is not overwritten.

## Impact Summary / AI-Ready Workflow

The Impact Summary page generates a structured draft from local project data:

- Metrics
- Narrative summary
- Key themes
- Signals of change
- Evidence gaps
- Recommended next steps

The app does not call an AI API. Instead, it includes a `Copy AI prompt` action that prepares a grounded prompt from local data. This is intentional for a static GitHub Pages frontend because it avoids exposing API keys in client-side code.

A future production version could send project data to a backend or serverless function, then call an AI model securely from the server side.

## Run Locally

Open `index.html` directly in a browser, or serve the folder with any static server.

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy On GitHub Pages

1. Push the repository to GitHub.
2. In the repository settings, open `Pages`.
3. Choose the main branch and root folder.
4. Save and wait for GitHub Pages to publish the static site.

No build step is required.

## Screenshots

Suggested screenshots for a portfolio post:

- Journal dashboard with `Nabolagets kraft`
- Rich journal evidence cards
- Impact Summary Draft
- Survey sharing / QR flow
- About Vis Det
- Project Notes / architecture card

## Limitations

- Data is stored only in the current browser.
- There is no authentication.
- There is no backend or multi-user sync.
- Attachments are stored locally and exported only as metadata.
- The Impact Summary is a deterministic local draft, not a real AI-generated report.
- It is not a production CRM or reporting system.

## Future Improvements

- Backend sync
- User accounts and role-based access
- Server-side AI report generation
- CSV/PDF exports
- Hosted survey pages
- Team/admin views
- Stronger analytics and reporting dashboards

## What I Learned

- How to structure a local-first internal tool with IndexedDB
- How to design a useful MVP without overbuilding the stack
- How to create a recruiter-facing product story around real workflows
- How to prepare an AI-ready workflow safely without exposing API keys
- How to balance qualitative impact notes with structured reporting data
