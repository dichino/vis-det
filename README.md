# Vis Det – Impact Journal

Vis Det – Impact Journal is a local-first web prototype for structured impact documentation, built with HTML, CSS, JavaScript and IndexedDB.

## Problem

Social-impact work often starts as workshops, mentoring sessions, local meetings and follow-up conversations long before it becomes formal reporting. Vis Det explores how small teams can document early evidence, track people reached, collect lightweight feedback and prepare a clearer impact narrative without setting up a backend.

The prototype is inspired by Norge Unlimited's work with local social entrepreneurship and neighbourhood-based impact documentation. It is not an official production system.

## Solution

Vis Det turns local project activity into a structured internal workspace: teams can capture evidence notes, track reach, collect lightweight survey feedback, export portable data and prepare a grounded impact summary draft from local records.

It is designed as a focused MVP for local impact documentation: practical internal-tool workflows, local-first architecture, validation-heavy import and responsible AI-ready reporting without pretending to be a production SaaS platform.

## Features

- Project-based impact journals
- People reached counts, tags and evidence attachments
- Search and date filtering for journal entries
- Rich demo data across January 2025 to June 2026
- Load and reset demo data actions for reliable demos
- Lightweight survey builder
- Standalone survey HTML export
- QR code generation for hosted survey files
- Survey response JSON import
- Import Wizard with preview, validation, warnings and confirm step
- Evidence Readiness Score calculated from local project data
- Timeline view grouped by month for project history
- Impact Summary Draft generated from local project data
- Copyable markdown summary and AI-ready prompt
- Export Report Package with markdown, project JSON and journal CSV
- English/Norwegian UI language toggle
- Local JSON import/export for backup and portability
- Guided demo walkthrough

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

Export/import uses JSON so the data can be moved or backed up manually. The import wizard validates records before they are written to IndexedDB, including missing project titles, missing entry text, invalid dates, non-numeric reach counts, possible duplicates, broken project relations, empty survey content and unsupported fields.

The report package is generated entirely in the browser. It downloads separate local files for the selected project:

- `impact-summary.md`
- `project-data.json`
- `journal-entries.csv`

A production version would need backend sync, authentication, role-based access and stronger file storage.

## Import Wizard With Validation

The Import Wizard replaces a basic file import with a safer internal-tool workflow:

- Choose JSON or simple journal-entry CSV
- Preview detected projects, entries and surveys
- Validate missing titles, invalid dates, broken relations, duplicate-looking entries and unsupported fields
- Review counts for valid records, warnings, errors and records ready to import
- Confirm before records are written to IndexedDB
- Show a result summary after import

Invalid records are not imported silently. Existing data is merged rather than overwritten.

## Evidence Readiness Score

The Evidence Readiness Score is calculated locally from the selected project:

- Number of journal entries
- Entries spread across time
- People reached coverage
- Percentage of entries with tags
- Percentage of entries with attachments
- Surveys and imported survey responses
- Recency of latest evidence note

The score produces a percentage, readiness label, strengths and gaps. This shows reporting logic and product thinking without adding analytics dependencies.

## Timeline

The Timeline groups journal entries by month so teams can quickly understand project history. It keeps the implementation simple and readable: no calendar library, no charts, and no backend.

## Export Report Package

The selected project can export reporting material directly from local browser data:

- `impact-summary.md`
- `project-data.json`
- `journal-entries.csv`

This supports a complete workflow: data in, structured documentation, readiness check, report out.

## Product and Engineering Value

The project demonstrates practical internal-tools engineering rather than a fake SaaS shell:

- Data validation before import
- Local data modeling with related projects, entries, surveys, responses and attachments
- Deterministic reporting logic from real local records
- Export workflows for handoff and portability
- User-friendly warning and error states
- Production-aware limitations around auth, sync, file storage and AI APIs

## Demo Data

When the database is empty, the app seeds a realistic demo dataset once using `localStorage` key `visdetDemoSeeded`.

The main demo project is `Nabolagets kraft`, covering January 2025 to June 2026 with:

- 21 journal entries
- 704 people reached
- 11 sample attachment filenames
- 3 surveys with imported demo responses
- Tags such as `workshop`, `ungdom`, `mentor`, `nabolag`, `partnerskap`, `effektmåling`, `læring` and `rapportering`

Existing user data is not overwritten.

If old weak demo data exists, the app can reset local data and load the full `Nabolagets kraft` dataset through the `Reset demo data` action.

## Impact Summary / AI-Ready Workflow

The Impact Summary page generates a structured draft from local project data:

- Metrics
- Evidence Readiness Score
- Timeline summary
- Narrative summary
- Key themes
- Signals of change
- Evidence gaps
- Recommended next steps

The app does not call an AI API. Instead, it includes a `Copy AI prompt` action that prepares a grounded prompt from local data. This is intentional for a static GitHub Pages frontend because it avoids exposing API keys in client-side code.

A future production version could send project data to a backend or serverless function, then call an AI model securely from the server side.

## Language Toggle

The app starts in English and includes a small English/Norwegian toggle in the sidebar. UI copy is translated with a simple client-side dictionary and the selected language is stored in `localStorage` using `visdetLanguage`.

User-created content is not machine-translated. Demo content includes curated Norwegian text for the sample dataset. This keeps the prototype static, predictable and safe for GitHub Pages.

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

Suggested screenshots for GitHub and project presentation:

![Project dashboard screenshot placeholder](docs/screenshots/01-project-dashboard.png)
![Import wizard validation screenshot placeholder](docs/screenshots/02-import-wizard-validation.png)
![Impact summary screenshot placeholder](docs/screenshots/03-impact-summary.png)
![Survey sharing screenshot placeholder](docs/screenshots/04-survey-sharing.png)

Suggested screenshots for a LinkedIn post:

- Journal dashboard with `Nabolagets kraft`
- Evidence Readiness Score and Timeline on the project dashboard
- Rich journal evidence cards
- Import Wizard validation states
- Impact Summary Draft
- Export Report Package actions
- Survey sharing / QR flow
- About Vis Det
- Project Notes / architecture card

## Limitations

- Data is stored only in the current browser.
- There is no authentication.
- There is no backend or multi-user sync.
- Attachments are stored locally and exported only as metadata.
- The report package downloads separate files instead of a zip archive to avoid adding dependencies.
- CSV import is intentionally limited to simple journal-entry rows.
- The Impact Summary is a deterministic local draft, not a real AI-generated report.
- It is not a production CRM or reporting system.

## Future Improvements

- Backend sync
- Authentication
- Role-based access
- Hosted surveys
- Serverless AI summary generation
- Audit logs
- Team collaboration
- PDF report export and zip report packages
- Stronger admin analytics and reporting dashboards

## What I Learned

- How to structure a local-first internal tool with IndexedDB
- How to validate imported local data before committing it
- How to turn project records into readiness scoring, timelines and exports
- How to design a useful MVP without overbuilding the stack
- How to shape a product story around real social-impact workflows
- How to prepare an AI-ready workflow safely without exposing API keys
- How to balance qualitative impact notes with structured reporting data
