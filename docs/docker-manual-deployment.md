# Oracle manual deployment

Oracle is a parallel web/API/worker instance using the existing Dockerfile, Compose services and Neon database. Vercel, Render, DNS and database placement remain unchanged. The five Oracle workflows run only through `workflow_dispatch`. Existing CI still runs on pushes/PRs against its disposable test database.

## VM and first setup

Verify tenancy status, home region, existing instances, storage and remaining free allocation before provisioning. Obtain approval before VM creation; never upgrade or create paid resources. As checked on 2026-10-14, [Oracle's current Always Free documentation](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) lists 1,500 A1 OCPU-hours / 9,000 GB-hours monthly (2 OCPUs / 12 GB total), plus 200 GB combined boot/block storage in the home region. Older 4 OCPU / 24 GB guides are no longer the documented Always Free allowance.

Proposed VM, subject to console eligibility, existing usage and capacity: Ubuntu 24.04 ARM64, `VM.Standard.A1.Flex`, 2 OCPUs, 12 GB RAM, 50 GB boot volume. Reuse a suitable existing VM. Verify running state, public IP, SSH administrator key, `uname -m`, `/etc/os-release`, `free -h`, `df -h` and existing services before changes.

Review and run `sudo bash deploy/oracle/bootstrap.sh` on the approved dedicated VM. It installs Docker from the official Ubuntu repository if absent, checks Compose, enables Docker on reboot and creates `chess-deploy` plus `/opt/chess-oracle`. It refuses conflicting runtimes rather than removing software. Docker membership is root-equivalent: this is a dedicated deployment account, without sudo, for this VM. Bootstrap leaves firewall, SSH settings and existing daemon configuration untouched for review.

Generate a dedicated Ed25519 deployment key on a trusted administrator machine. Install its public key in `/home/chess-deploy/.ssh/authorized_keys`, owned by `chess-deploy`, mode 600; prefix the entry with `restrict` to disable forwarding, PTY and agent forwarding. Keep the administrator key separate for test tunnels. Store the private key only in Actions and a protected administrator backup; never commit it.

OCI NSGs/security lists and the host firewall should permit SSH only from the administrator and deployment runner's controlled egress. Standard GitHub-hosted runners have changing egress addresses: a narrow allowlist requires an existing runner with fixed egress or approved private connectivity. Do not silently open SSH globally. Verify an active administrator session before changing rules; do not flush existing firewall rules. Keep password SSH and root login disabled. Do not expose ports 3000, 8080 or Docker Engine TCP.

## Protected runtime environment

Copy `deploy/docker/stack.env.example` to `/opt/chess-oracle/stack.env`, owned by `chess-deploy`, mode **600**. API and worker share it; it stays on the VM. Never print resolved Compose configuration or upload runtime secrets to Actions. The image contains no backend environment file.

Use the existing Neon pooled URL with TLS and a connection budget covering Render, local workers and both Oracle processes. Retain the direct URL, but workflows never run migrations. Copy the existing `LICHESS_TOKEN_ENCRYPTION_KEY`, lifecycle identity/audit HMAC keys, versions and previous-key maps exactly. New keys would break shared-token decryption and identity protection.

Keep `AUTH_MODE=clerk` with the existing Clerk issuer/JWKS/audience. Initial tunnel values are `http://localhost:8080` for Oracle-only `CORS_ORIGIN`, `WEB_APP_URL`, `CLERK_AUTHORIZED_PARTIES`, and `http://localhost:8080/api/auth/lichess/callback` for `LICHESS_OAUTH_REDIRECT_URI`. Verify Clerk accepts the test origin and the Lichess client permits this callback. Add allowed origins/callbacks without removing Vercel/Render entries. Production Clerk may require HTTPS/domain configuration: don't weaken authentication to enable localhost. The web image uses `/api` and the same Clerk application's public publishable key.

Retain example worker timings; each shutdown timeout must be below the Oracle worker's 60-second grace period. Use `STOCKFISH_ENGINE=wasm`, keep `POSITION_CLEANUP_ENABLED=false`, and configure optional AI/MCP only when needed. Check enabled features against `.env.example` and the production environment. Worker startup can claim real production jobs and perform existing terminal-job retention; coordinate with the local worker before first launch.

## GitHub configuration

Required repository Actions secrets:

- `ORACLE_HOST`: SSH hostname or IPv4 address, port 22.
- `ORACLE_USER`: `chess-deploy`.
- `ORACLE_SSH_KEY`: dedicated private deployment key.
- `ORACLE_SSH_HOST_KEY`: complete trusted OpenSSH known_hosts entry for the host.

Obtain the host public key/fingerprint through the OCI console or a trusted administrator session and compare it before setting the secret. `ssh-keyscan` alone does not establish trust. Strict host checking is always enabled. Use Settings → Secrets and variables → Actions, or `gh secret set NAME < protected-file`; never put credentials in arguments or overwrite unrelated secrets.

Set repository **variable** `ORACLE_WEB_CLERK_PUBLISHABLE_KEY` to the public `pk_test_...` or `pk_live_...` key. No Oracle password/MFA enters Actions. GHCR uses ephemeral `GITHUB_TOKEN`: Build & Deploy has `packages: write`; Rollback has `packages: read`; lifecycle jobs only have `contents: read`. For a pre-existing GHCR package, grant this repository Actions access. Private pulls use temporary remote Docker credentials deleted after the operation; no persistent registry PAT is required. An abruptly killed connection may leave a mode-700 `.incoming.*` directory: remove it after verifying no operation is active. Its Actions token expires automatically.

Workflow files must reach the default branch to appear in Actions. Repository policy requires a reviewed PR and explicit approval to merge. Run from trusted branches only: workflow editors have deployment access.

## Manual controls

Open GitHub → Actions, select the workflow and **Run workflow**:

| Workflow | Behavior |
| --- | --- |
| **Build & Deploy** | Builds the selected ref's exact full SHA on ARM64; publishes `ghcr.io/vokerg/chess-repertoir-trainer:<40-character-SHA>`; deploys all three services by resolved digest. |
| **Stop** | Gracefully stops all, worker, API or web without removing containers. |
| **Start** | Starts the saved release without rebuilding. Selecting web also starts its API dependency. |
| **Restart** | Restarts selected services without a build, including a previously stopped selection. Web includes API. |
| **Rollback** | Accepts a published full commit SHA, requires schema-compatibility acknowledgment, resolves its digest and recreates the complete stack. |

All operations share one concurrency group and a VM `flock`. Do not cancel an active deployment. GitHub can replace an older pending run if several queue up; check the run list before scheduling another.

Build & Deploy refuses an existing commit tag. If publication succeeded but SSH failed, use Rollback with that SHA to retry. Containers use `@sha256:...`, so a later tag change cannot change Start/Restart. The VM stores the chosen image/SHA in `deployment.env`, the prior version in `previous.env`, and successful deployments in `history.log`. Release Compose/control files live in `releases/<SHA>` with a `current` symlink. Version metadata is persisted before recreation so Start can recover an interrupted deployment. Failure reports do not trigger automatic rollback or migrations: inspect actual state before retrying. Rollback uses the current workflow's Compose settings and replaces all services together to avoid mixed API/worker images.

`restart: unless-stopped` recovers crashes while honoring explicit stops across Docker/VM restarts. Pushes/merges never start Oracle. Build & Deploy and Rollback explicitly start all services. Start/Restart of one service does not start an unrelated worker. Stopping API alone can cause web proxy errors until API starts again.

## Breaking changes and shared Neon

1. Run **Stop → worker**, or **all**, and verify successful shutdown. Stop local/other workers separately; Oracle controls cannot stop them.
2. Review migrations against every deployed Render/Oracle API/worker version. There is no environment-isolated queue.
3. Apply migrations only as a separately approved operation after backup and compatibility review.
4. Merge code, manually run **Build & Deploy**, then verify health and a real approved job.

**The existing Render setup documents `npm run db:migrate` in its build command.** If the live service uses that command and auto-deploys on merge, it can apply migrations before the manual step. Inspect Render settings and obtain approval for any production-setting change. Oracle workflows do not modify Render. CI's existing migration step targets disposable test PostgreSQL, not Neon.

Use expand/contract changes while versions differ. Drops, renames, mandatory fields, enum changes and lifecycle triggers can break older Prisma clients. For example, `20260621120000_subline_attempt_stats` drops Line/MoveNode fields and `20260608210000_remove_line_repertoire_updated_at` removes a column. Older images may be incompatible with the current schema. Rollback never reverses migrations or database state. Verify the deployed Render commit and Neon migration history before approving changes; repository inspection alone cannot establish compatibility.

## Worker reliability and resources

The existing worker runs JobTask, account import, preparation reconciliation, account/user lifecycle and optional position-cleanup loops. JobTask/import repositories use transactional PostgreSQL claims, `FOR UPDATE SKIP LOCKED`, work-key fencing, heartbeats and stale recovery. Lifecycle repositories also fence claims. SIGINT/SIGTERM stops all loops and waits for cleanup/Prisma disconnect, failing on timeout. Oracle runs Node directly under Compose init for signal delivery.

This supports normal concurrent claiming, but does not promise unconditional exactly-once external effects after lease expiry, suspension or mixed-version execution. Local and Oracle workers consume the same production queue regardless of which API submitted a job. Initially stop the local worker before Oracle launch. Keep one Oracle worker; review side effects, matching stale thresholds and schema compatibility before concurrency.

Stockfish loads `lite-single` WASM through Node worker threads, avoiding an x86 executable. Build & Deploy runs an isolated ARM64-image WASM analysis smoke test before connecting to the VM. Actual production-job analysis must still be tested. Initial bounds are worker 1 CPU / 3 GiB, API 0.75 CPU / 1.5 GiB, web 0.25 CPU / 256 MiB, bounded process counts, and three 10-MB logs per service. Concurrent loops can still hit these limits; monitor OOM/restarts and latency. These are initial bounds, not measured capacity. Oracle may reclaim idle free instances under its published policy.

## Verification and operations

Use the separate administrator SSH key (the deploy key disables tunnels):

```bash
ssh -L 8080:127.0.0.1:8080 ubuntu@VM_HOST
curl --fail http://localhost:8080/
curl --fail http://localhost:8080/health
```

Deployment waits for API/web Compose health, then verifies worker survival without restarts for 20 seconds, both worker startup messages, and a read-only `SELECT 1` database probe. `/health` alone is liveness, not database readiness. Startup checks do not prove processing success: submit an approved test job and confirm completion/real WASM analysis, then test authenticated browser and OAuth flows. Workflows do not create test jobs in production.

On the VM as `chess-deploy`:

```bash
cd /opt/chess-oracle
docker compose --env-file deployment.env -p chess-oracle -f current/compose.yml -f current/oracle.yml ps --all
docker compose --env-file deployment.env -p chess-oracle -f current/compose.yml -f current/oracle.yml logs --tail 100 worker
bash current/control.sh stop worker
bash current/control.sh start worker
free -h
df -h
docker system df
```

Inspect logs privately. For failed deployment, check secrets/variable, SSH allowlist and known_hosts, GHCR package access, disk, architecture, runtime placeholders, Clerk configuration and applied schema. Never paste stack.env or resolved Compose config into an issue. Start uses the cached deployed image; if it is absent, use Rollback to authenticate/pull again.

Logs rotate automatically. After successful deployment, scoped cleanup retains the three newest cached application images, the selected and previous images, every image referenced by any container (even stopped), and images tagged for other repositories. Removal is never forced; discovery failure skips cleanup. Monitor disk usage because failed deployments can leave extra images. Never prune Docker globally. Registry images remain available for rollback; archive older release metadata only after preserving rollback details.

For VM replacement: approve a free replacement within aggregate quotas, rerun bootstrap, restore protected stack.env with the same stable keys, install a fresh deployment public key, update host/user/key/verified-host-key secrets, then use Rollback to pull a known compatible SHA. No migration/database restore is part of VM replacement. Preserve administrator access until validation passes.

Public access requires a separately reviewed HTTPS origin, TLS termination/certificate renewal, OCI/host ingress for 443, and additive Clerk/CORS/Lichess changes. Keep the application upstream on loopback. Do not expose plain HTTP, change existing DNS or trust forwarded headers from arbitrary peers. Public HTTPS infrastructure is not provisioned by these files.
