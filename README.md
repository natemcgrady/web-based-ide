# web-based-ide

A browser IDE built with Next.js that runs code and shell commands in isolated Vercel Sandbox instances.

## Core constraints implemented

- App is built with Next.js App Router and deployable on Vercel.
- Arbitrary execution and shell commands run only in Vercel Sandbox.
- Browser terminal streams output over SSE.
- Preview server runs inside sandbox and is embedded in an iframe.

## Architecture

- **Frontend:** Monaco editor, file explorer, terminal panel, preview panel.
- **API routes:** session lifecycle, file sync, terminal input/events, preview start/status.
- **Sandbox layer:** `@vercel/sandbox` for isolated command execution.
- **Persistence layer:** in-memory by default, with optional Upstash Redis and Neon Postgres hooks.

## Environment variables

Set one of the Sandbox auth strategies:

- Preferred on Vercel: `VERCEL_OIDC_TOKEN` (managed by Vercel context)
- Explicit credentials:
  - `VERCEL_SANDBOX_TOKEN`
  - `VERCEL_SANDBOX_PROJECT_ID`
  - `VERCEL_SANDBOX_TEAM_ID`

Optional:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `DATABASE_URL`
- `CRON_SECRET`
- `SANDBOX_TIMEOUT_MS`
- `SANDBOX_MAX_LIFETIME_MS`
- `SANDBOX_IDLE_TIMEOUT_MS`
- `SANDBOX_MAX_ACTIVE_PER_USER`
- `TERMINAL_MAX_COMMAND_LENGTH`

## Local development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Scripts

- `pnpm dev` - run app locally
- `pnpm build` - production build
- `pnpm lint` - run ESLint
- `pnpm typecheck` - TypeScript checks
- `pnpm test` - Vitest
- `pnpm test:e2e` - Playwright
- `pnpm db:generate` - generate Drizzle migrations

## Deployment on Vercel

1. Import this project into Vercel.
2. Configure environment variables listed above.
3. Deploy.
4. Optional: set `CRON_SECRET` so `/api/maintenance/cleanup-sessions` can be called securely by cron.

`vercel.json` includes a cron job to clean expired sessions every 10 minutes.

## Reference docs

- Vercel Sandbox docs: `https://vercel.com/docs/vercel-sandbox`
- IDE implementation inspiration: `https://dev.to/abdddd/how-to-build-a-web-ide-like-codesandbox-38e6`
- Extensible IDE framework inspiration: `https://github.com/eclipse-theia/theia`
