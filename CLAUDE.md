# ForgePilot back-office (CLAUDE.md)

Internal tool for the ForgePilot team. Screens only: every call goes to `forgepilot-backend`'s `/admin/*` endpoints through the proxy in `next.config.ts`. See `AGENTS.md` for the Next.js version rules.

## Rules

- **No backend logic, database or secrets here.** Who is staff, what they may do and the audit trail are the backend's job. If a screen needs something new, add the endpoint in `forgepilot-backend` first.
- **`lib/api.ts` is the only place that knows URLs.** Every response is checked against a Zod schema.
- **Every action that changes a customer needs a typed reason** and a confirmation dialog that says what the customer will see.
- **Never show customer code, logs or credentials.** The backend does not return them; do not ask it to.
- The amber "Staff back-office" marking stays on every screen so nobody mistakes this for the customer app.
- Times are shown in UTC. Plain English copy; the founder is non-technical.
- Every screen handles loading, empty and error states. WCAG 2.2 AA: labelled inputs, keyboard access, visible focus.
- Before finishing: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## Layout

```
app/login            staff sign-in (signs non-staff accounts back out)
app/(admin)          shell + overview, workspaces, users, jobs, audit
components/ui        primitives (same design system as the customer app)
components/common    page header, stat, loading/empty/error states
lib/api.ts           schemas, queries and actions for /admin/*
proxy.ts             redirects to /login when there is no session cookie
```
