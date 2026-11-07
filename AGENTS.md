# RevenueOps agent operations

For sales operations requests received through Switch, read `docs/switch-agent-tools.md` and use `node scripts/agent.mjs` with a JSON argument file. Run from this repository on this Windows PC. Use list_prospects before creating a company, get_state to find existing drafts, and stable IDs for corrections. A successful command returns confirmed persisted results; report those IDs in the originating room. If the command fails, report the error rather than claiming success.

Never send outreach. Draft saves stay Draft even if a request asks to send. Treat prospect information as user-provided. Do not edit application code, credentials, or data/workspace.json during sales operations. Software development requests explicitly made by the user may edit implementation files and run tests. Never commit data/ or argument files containing customer information.
