# ForgePilot back-office

The internal tool for the ForgePilot team (the "super admin" level, above every customer workspace). Customers never see or use it.

What staff can do here:

- **Overview**: workspaces by plan, users, suspended workspaces, background-job health, and which platform connectors are set up.
- **Workspaces**: search, open one, see its members, size and spend this month. Suspend it (read-only for the customer), restore it, or set its plan by hand (enterprise contracts, goodwill).
- **Users**: search by name or email and see which workspaces they belong to.
- **Background jobs**: failed, queued and running jobs, with a retry button for failed ones.
- **Staff audit log**: everything the team did here, who did it and why.

What it deliberately cannot do: read a customer's code, logs or credentials, or sign in as a customer.

## How it fits together

This app has no API or database of its own. It is a set of screens over the `/admin` endpoints of [`forgepilot-backend`](https://github.com/glalit52/forgepilot-backend), which decides who is staff and records every action. No second backend is needed.

```
browser ──> this app (screens only) ──> forgepilot-backend /api/v1/admin/* ──> database
```

## Who gets in

Access is decided by the backend, not by this app:

1. The person's email is listed in the backend's `PLATFORM_ADMIN_EMAILS` setting.
2. They have a normal ForgePilot account with that email, and the email is verified.

Anyone else who signs in here is told they have no access and is signed out again.

## Run it

You need Node.js 22+, pnpm and a running `forgepilot-backend`.

```bash
pnpm install
```

```bash
BACKEND_URL=http://localhost:8080 pnpm dev
```

Open <http://localhost:3300>. On the backend, set `APP_URL` or `CORS_ORIGINS` so it accepts requests from this app's address.

For production the backend address is fixed when the app is built, so set `BACKEND_URL` for the build as well as for the start:

```bash
BACKEND_URL=https://api.example.com pnpm build
```

## Checks

| Command          | What it checks                   |
| ---------------- | -------------------------------- |
| `pnpm lint`      | Code style and React rules       |
| `pnpm typecheck` | TypeScript types (strict)        |
| `pnpm test`      | The staff gate and the API layer |
| `pnpm build`     | Production build                 |

## Before putting it on the internet

- Host it on its own address (for example `admin.yourdomain.com`), separate from the customer app.
- Put it behind your company login or VPN as a second lock. The backend check is the real one, but an internal tool should not be reachable by everyone.
- Keep this repository private.

## Not built yet

- Automated browser tests (they need a backend running next to them in CI).
- Two-factor sign-in for staff.
- Deleting a workspace or user from here, impersonation and refunds: intentionally left out for now.
