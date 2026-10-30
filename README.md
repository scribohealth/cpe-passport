# Scribo CPE Passport

Private, non-production Phase 1 implementation for Hong Kong pharmacists. Use synthetic identities and sample certificates only. Applications are stored in Scribo; institutional delivery, professional verification, confirmed pairing and Phase 2 claims are outside this build.

## Stack

- TanStack Start / React, deployed as a Cloudflare Worker.
- D1 for authentication, versioned passport records, immutable enrolment snapshots, notifications and audit metadata.
- Private R2 for certificates, with the `DOCUMENTS` binding targeting `cpe-passport-production`. Every preview/download requires an owner session.
- Better Auth with a Drizzle D1 adapter for email/password, verification, single-use password reset and optional Google OAuth. Automatic account linking is disabled.
- An email outbox with an optional Cloudflare Email Routing `send_email` adapter. Final email service selection remains open; real provider delivery has not been configured or validated here.

The user's explicit D1/R2 choice takes precedence over the service-name uncertainty recorded in the original specifications. The two uploaded specifications remain unchanged in `docs/specs/`.

## Local setup

Node.js 22.12+ (Node 24 recommended) and npm are required. Local D1/R2 do not need a Cloudflare account.

```bash
npm ci
cp .dev.vars.example .dev.vars
# Replace BETTER_AUTH_SECRET with a random secret of at least 32 characters.
# Example generation: openssl rand -base64 48
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:5173`. Register a synthetic account; verification is required for signing/submission, but partial passports and drafts can be saved first. Passwords must contain at least 12 characters.

`APP_URL` must match the browser origin, including the port. The local `.dev.vars.example` overrides the deployed origin with `http://localhost:5173`. A different dev port requires updating the local configuration. Never commit `.dev.vars` or credentials.

In an executor where the home directory is read-only, prefix Wrangler/Vite commands with `XDG_CONFIG_HOME="$PWD/work/config"`. `CLOUDFLARE_CF_FETCH_ENABLED=false` avoids the optional development request for Cloudflare request metadata.

## Demo email and account recovery

Default `EMAIL_MODE=outbox` persists emails without sending them. There is no web endpoint to list the outbox or disclose verification/reset links. An authorised developer can inspect the **local synthetic-data database**:

```bash
npx wrangler d1 execute DB --local --command 'SELECT subject, recipient, body, status FROM email_outbox ORDER BY created_at DESC LIMIT 10'
```

Open the verification link in the test browser. Password reset uses a 30-minute single-use link and revokes existing sessions. Email verification links expire after one hour. Changing the account email requires verification; submitted snapshots preserve their original address.

Do not use the local inspection command against real applicant data or publish its output. Support access has no pharmacist-facing bypass; file reads and record changes produce metadata-only audit events.

Optional Google sign-in:

1. Create a Google OAuth **web application** client.
2. Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.dev.vars`.
3. Register `http://localhost:5173/api/auth/callback/google` as the authorised redirect URI (use the exact HTTPS origin for a private deployed demo).
4. Restart the dev server. Without credentials, the Google action is visibly unavailable.

Provider identity is stored independently of email. Matching an existing email does not silently merge accounts. Account linking is deliberately unavailable; there is no unverified linking shortcut. Live Google redirect/callback behaviour remains an environment-dependent acceptance check.

## Documents and reminders

Use `docs/samples/demo-registration.pdf` and `docs/samples/demo-practising.pdf`, clearly marked static synthetic documents. Regenerate them with `npm run samples`.

Upload PDFs, JPEGs or PNGs, up to 10 MiB. Server checks the MIME declaration, file signature, length and obvious active PDF features. These prototype checks and sandboxed responses are **not** a malware-scanning service. Production ingestion requires a reviewed scanning/validation policy. PDF object streams, scripts, embedded files, encrypted content and several active form features are rejected by the demonstration policy.

Upload a registration certificate and a practising certificate for the current Hong Kong calendar year with a validity-end date. Every upload creates a private new version; old versions remain available to the owner. Practising-certificate licence years and June–May CPE cycles are separate.

A daily Worker cron runs at 09:00 Hong Kong time. Demo reminder defaults are 30 days and 7 days before expiry, and once after expiry. There is one event per certificate/trigger/channel. A future-year upload does not clear a missing current-year requirement. Applicable replacement versions suppress pending notifications; an expired previous-year certificate still triggers an update reminder if no applicable replacement exists.

With `npm run dev` running, simulate a date without adding a production support endpoint:

```bash
npm run reminders:simulate -- 2026-12-01
```

Use a certificate expiring on 31 December 2026 to demonstrate the 30-day reminder. This calls only Miniflare's localhost scheduled-event endpoint; `EMAIL_MODE=outbox` still sends no external messages. The same service is tested with simulated dates by `npm test -- -t 'renewal reminder'`.

### Optional controlled Cloudflare test delivery

Provider provisioning and selection are not complete. The optional adapter requires all of:

- A configured Cloudflare Email Routing sending domain and an approved `EMAIL_FROM`.
- A `SEND_EMAIL` binding declared using Cloudflare `send_email`, restricted to the same controlled verified destinations used by the demo.
- `EMAIL_MODE=cloudflare` and an exact comma-separated `TEST_EMAIL_ALLOWLIST` of controlled recipients.

No allowlist match means the message is marked blocked. The service sends plain text only, without documents, partial IDs or signature images. Failures preserve in-app reminders and stay retryable, with a lease and a five-attempt ceiling. Outbox event keys and stable message IDs prevent ordinary duplicate processing. The external send and D1 completion update cannot form one transaction: a process crash after a successful handoff can still cause a retry. Exactly-once external delivery needs provider-supported idempotency or reconciliation before real use. There is no institution email route.

## Enrolment

The three sections collect cycle/previous enrolment, administrator-specific answers, then review/acknowledgement/signature. CUHK has exactly the five supplied categories; no additional eligibility choice is invented. Administrators without an approved question version cannot be signed/submitted.

Partial drafts use expected-version checks. Profile, certificate, answers, statement and question/cycle versions bind the attestation. Changes require fresh acknowledgement and a typed or drawn signature. All final checks run on the server.

A conditional D1 update atomically stores the snapshot, submission reference and timestamp. Database constraints enforce one submission per owner/cycle/administrator, and triggers prohibit changes/deletion of submitted records. The draft ID is the idempotency key; retrying submission returns the same receipt. Profile/document concurrency checks protect the signed snapshot. Receipts display **Submitted in Scribo — administrator acceptance not confirmed**.

## Verification

```bash
npm run typecheck
npm test
npm run build
# or: npm run check
```

Vitest exercises real local D1 and R2 through Miniflare, with synthetic accounts and no external email. It covers authentication, email changes/reset, owner isolation, private document versions, draft conflicts, attestation invalidation, immutable snapshots, concurrent submission, duplicate applications, typed/drawn signatures, cycle boundaries and reminder suppression/deduplication. See `docs/phase-1-implementation.md` for acceptance evidence and remaining checks.

## Configuration and a private deployed demo

`src/shared/config.ts` contains explicit versioned June–May cycles, the CUHK question set and the clearly labelled sample collection statement. Dates beyond the configured window require explicit new cycle records; no dates or professional rules are inferred. Reminder timing and file size are configurable Worker variables. The UI is English.

`wrangler.jsonc` configures D1 `cpe-passport-production` (`dea0b862-4e75-494e-84ef-8c2b200a0683`), private R2 `cpe-passport-production`, and `APP_URL=https://cpe.scribo.com.hk`. Its Custom Domain route asks Cloudflare to configure `cpe.scribo.com.hk` on deployment, including DNS and the TLS certificate; the domain must be in the deploying Cloudflare account. Default `workers.dev` and preview URLs are disabled.

Before any deployment, confirm the configured D1/R2 resources exist and the bucket remains private, apply migrations with `--remote`, set a Worker `BETTER_AUTH_SECRET`, configure any optional OAuth/email service, and place the demo behind an appropriate private access gate. `npm run deploy` is provided but has not been run. No resources are provisioned automatically and no live deployment is implied by this repository.

To reset **only a disposable local synthetic-data environment**, stop the dev server, remove `.wrangler/state/v3/d1` and `.wrangler/state/v3/r2`, then re-run migration/seed and create new accounts. This deletes local accounts, documents and reminders; it is not a production retention workflow.


## Preview deployment

The named Cloudflare environment `preview` deploys a separate Worker, `cpe-passport-staging`, at `https://staging-cpe.scribo.com.hk`. It uses D1 `cpe-passport-staging` (`05911c7f-9048-432d-b28d-981bef198331`) and private R2 `cpe-passport-staging`. Email mode, controlled recipient allowlist, upload limit, reminder schedule and cron match production. The Custom Domain is configured on deployment; default workers.dev/version preview URLs remain disabled.

Cloudflare Vite selects the environment **before building**. Use these commands from the repository root:

```bash
# Preview (staging resources)
npm run db:migrate:preview
npx wrangler secret put BETTER_AUTH_SECRET --env preview --config wrangler.jsonc
npm run deploy:preview

# Production (production resources)
npm run db:migrate:production
npm run deploy
```

`npm run build:preview` only builds; `npm run build` explicitly builds production. The deploy scripts rebuild their selected environment. Changing only the Wrangler deploy flag after building does not switch the generated artifact. Remote migrations explicitly select the source config to avoid using whichever generated config was built last.

Secrets are separate for each Worker: configure a separate preview `BETTER_AUTH_SECRET` and any optional Google OAuth credentials. The preview Google callback is `https://staging-cpe.scribo.com.hk/api/auth/callback/google`. Cloudflare Access protection must also cover the staging hostname. Deployment scripts do not apply database migrations automatically.
