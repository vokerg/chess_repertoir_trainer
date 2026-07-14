# Mobile development

`apps/mobile` is the supported React Native / Expo client. It is intentionally narrower than the Angular app: the current product surface is downloading owned repertoire content, training it offline, and synchronizing completed attempts.

See [Native mobile architecture](architecture.md) for persistence, synchronization, and ownership boundaries.

## Prerequisites

Use Node 22.13 or newer and install from the repository root:

```bash
nvm use
npm install
```

The mobile workspace consumes compiled exports from `packages/chess-domain` and `packages/contracts`. Its `prestart`, `prebuild`, `pretest`, and `prelint` scripts build those dependencies automatically.

## Configure the API

The mobile client requires the normal Fastify API and Clerk JWT verification. Copy the root environment example and configure PostgreSQL plus Clerk:

```bash
cp .env.example apps/api/.env
```

Relevant API values:

```text
AUTH_MODE=clerk
CLERK_JWT_ISSUER=https://<your-clerk-domain>
CLERK_JWKS_URL=https://<your-clerk-domain>/.well-known/jwks.json
CLERK_AUTHORIZED_PARTIES=http://localhost:4200
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

Native Clerk session tokens may omit `azp`; the API still validates signature, issuer, optional audience, and subject. Do not add a fake mobile origin to `CLERK_AUTHORIZED_PARTIES` solely for native requests.

Apply the API migration that adds mobile content revisions and idempotent attempt ingestion:

```bash
npm run db:migrate
```

## Configure Expo

Create the workspace environment file:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Set:

```text
EXPO_PUBLIC_API_BASE_URL=http://<development-machine-LAN-IP>:3000
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

The API base may be either the server origin or an origin ending in `/api`; the mobile API client normalizes both forms. A physical device cannot reach the development machine through `localhost`, so use a LAN address or another URL reachable from the device.

The publishable key must belong to the same Clerk application configured by the API issuer and JWKS values.

## Run locally

Start the API:

```bash
npm run dev:api
```

Start Expo in another terminal:

```bash
npm run dev:mobile
```

Workspace target shortcuts:

```bash
npm run ios --workspace=apps/mobile
npm run android --workspace=apps/mobile
npm run web --workspace=apps/mobile
```

The app signs in online, refreshes the owned-course manifest, and downloads selected course revisions. After a course is active locally, browsing and training use SQLite and do not require the API.

## Current offline flows

- Open a downloaded course and browse chapters and lines.
- Start or resume a single-line attempt.
- Finish naturally or early and review the saved result.
- Start or resume a course or chapter marathon.
- Switch among All, Weak, Untrained, and Mixed modes.
- Continue to the next line without a network request.
- Queue completed attempts and synchronize them when authentication and connectivity are available.
- Retry synchronization manually and inspect queued, accepted, or rejected counts.

Explicit sign-out locks the local user without deleting downloaded content or pending attempts. A later authenticated unlock restores access to that user's rows.

## Local data and reset behavior

SQLite is the mobile source of truth for downloaded revisions, active sessions, immutable training events, completed attempts, marathon runs, and synchronization state. Every durable query is scoped by the Clerk subject stored as `app_user_id`.

Deleting the app or clearing its local storage removes downloaded content and unsynchronized attempts. Reinstall/reset testing must therefore be treated as destructive unless the outbox has already synchronized.

Course updates activate a complete staging revision in one exclusive transaction. A failed update leaves the previous active revision available, and retired revisions are retained while an existing session still references them.

## Automated validation

From the repository root:

```bash
npm run build:mobile
npm run test:mobile
npm run lint:mobile
npm run expo:check
npm run check:architecture
```

`build:mobile` runs Expo exports for iOS and Android. It is a compile/export gate, not proof of app-store readiness or physical-device behavior.

## Manual release gates

Before treating the native client as release-ready, validate at least:

- sign-in, manifest refresh, initial download, update, and failed-update rollback;
- app-kill resume during single-line training and during each marathon mode;
- completion while offline followed by reconnect upload;
- lost-response retry and duplicate convergence;
- stable server rejection diagnostics and manual retry behavior;
- standalone iOS cold launch with no network or Metro;
- physical Android board interaction and offline launch;
- native iOS and Android exports/installations;
- final licensing acceptance for production Chessground distribution.

Selected-line and selected-subline marathons remain the next product slice; course and chapter marathons are the current supported scope.
