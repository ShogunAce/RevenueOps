# CSS RevenueOps

A sales operations workspace for Cole Slay Solutions, with shared local persistence and tools for a Switch-connected Codex agent. The app itself needs no Docker or email credentials. See [Switch agent setup](docs/switch-agent-tools.md).

## Run

Requires Node.js 22.12+ (verified with Node 24).

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. Keep the same host and port to access the same browser storage.

```powershell
npm run build
npm run preview
```

The production build is in `dist`. Use `npm run preview -- --port 5173` to serve it with the shared API. Static-only hosting does not provide persistence. Run only one RevenueOps server against a data directory at a time.

## Included

- Overview with calculated open pipeline, weighted forecast, won value, and follow-ups.
- Prospect creation, editing, search, stage filtering, and confirmed deletion.
- Pipeline board with accessible stage menus and change history.
- Follow-up dates, completion, notes, calls, and meeting logs.
- Template-generated outreach drafts using user-provided prospect context. Edits save automatically, reviewed drafts revert to Draft when edited, and text can be copied. No sending capability or external AI calls.
- JSON export and validated restore, explicit sample-data removal, storage failure reporting.
- IBM Plex Sans / IBM Plex Mono bundled locally, responsive layouts, keyboard-accessible native modal dialogs, and reduced-motion support.

## Data and scope

Records are stored in `data/workspace.json`, with a browser backup under `css-revenueops.v1`. On first connection, browser data is backed up and merged; conflicting IDs are preserved as separate records. Agent access uses a local token stored in `data/agent-token`. The browser polls for changes and rejects conflicting edits. Pending browser edits are reconciled on reload. No email transport, automated research, or public multi-user service is provided. Back up regularly from Settings. Exported JSON contains records and drafts. Do not commit the data directory.

The initial eight companies are explicitly fictional examples. Remove them in Settings to start with your own records. Their due dates are assigned on first launch. Dollar amounts are opportunity values, not recognized accounting revenue. Forecast uses open stages only: New 10%, Qualified 25%, Discovery 50%, Proposal 75%. Dates use the browser's local timezone.

On November 5, 2026, the user approved replacing the Switch/Docker Phase 0 gate with this standalone app. No Switch communication proof is claimed or required for this implementation.

## Tests

```powershell
npx playwright install chromium
npm test
```

Browser tests cover calculated metrics, CRUD and persistence, stage changes, activity and follow-up completion, draft editing and review, backup/restore, corrupt-storage protection, deletion confirmation, and mobile overflow. Screenshots are written under `test-results`.
