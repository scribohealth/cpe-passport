# Phase 1 implementation and acceptance evidence

Implemented on 30 October 2026 (Hong Kong). This is a private demonstration foundation, not a production launch or an institutional application channel. The original uploaded specifications were committed unchanged before implementation (`5890ab3`). The user's explicit TanStack Start / Cloudflare Workers / D1 / R2 selection determines this implementation; wording inside the attachments is product context, not permission to deploy, contact institutions or implement Phase 2.

## Implemented behaviour

- TanStack Start replaces the starter SPA. A Cloudflare Worker routes authenticated API requests, SSR and scheduled certificate reminders.
- Email/password accounts, email verification, single-use password reset with session revocation, verified email changes, database-backed auth rate limits and optional Google OAuth. Provider account linking is disabled.
- Partial personal/qualification particulars, completion checklist and separate email-ownership / uploaded-document / pairing labels.
- Private owner-authorised R2 uploads, previews/downloads and preserved document versions. Annual licence years remain separate from CPE cycles.
- Three-section enrolment, partial drafts with version checks, exact CUHK choices, sample data statement and typed/drawn signatures. Relevant changes invalidate attestations.
- Server-authoritative atomic submission with unique references, idempotent retries, owner/cycle/administrator duplicate prevention, immutable snapshots and read-only receipts/history.
- In-app renewal notifications and a retryable test-email outbox, scheduled-date simulation, event deduplication and suppression after applicable replacements. No institutional transmission.
- Metadata-only audit events for profile/document/application changes and file access; no personal contents in application logs.

## Automated acceptance evidence

`npm test` passes all 38 tests using real local D1 and R2 bindings through Miniflare, synthetic accounts, and no external provider calls.

| Spec scenario | Evidence / remaining environment check                                                                                                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1-01         | Registration, hashed storage, verification link, single-use password reset, session revocation and sign-in to the same account; verified email-change flow.                                                                                                                    |
| P1-02         | Google configuration path exists and implicit linking is disabled. Live Google redirect/callback still requires configured OAuth credentials and a controlled test account.                                                                                                    |
| P1-03         | Partial passport saves; full IDs are rejected; stale versions conflict; owner records stay separate. Browser walkthrough saves a complete synthetic profile.                                                                                                                   |
| P1-04–05      | Passport completeness checks require both certificates/current-year evidence; server signing/submission repeats completeness validation. Status labels remain uploaded/unverified and pairing not confirmed.                                                                   |
| P1-06         | New certificate versions preserve owner-only old files and existing submitted snapshot references.                                                                                                                                                                             |
| P1-07         | Simulated 30-day/7-day/expired events, repeated scheduling, event/channel deduplication, future-year handling, New Year expiry and same-year suppression. `npm run reminders:simulate` also exercises the running local Worker. Real Cloudflare delivery remains unconfigured. |
| P1-08         | Current/upcoming explicit June–May cycles and Hong Kong midnight boundary tests; separate licence years.                                                                                                                                                                       |
| P1-09         | No answer removes stale effective dates. Server requires a date within the selected cycle for Yes (provisional rule).                                                                                                                                                          |
| P1-10         | Exactly five CUHK categories; invalid category cannot be signed. No fabricated eligibility category.                                                                                                                                                                           |
| P1-11         | Typed and drawn signature submissions pass in separate applications; blank/repeated-point signatures and missing attestation fail.                                                                                                                                             |
| P1-12         | Two concurrent submits return one receipt. Another draft for the same owner/cycle/institution is blocked on submission.                                                                                                                                                        |
| P1-13         | Profile edits and document replacement after submission leave the original snapshot unchanged; submitted writes are denied.                                                                                                                                                    |
| P1-14         | Unauthenticated and cross-origin writes fail. Another user's document/application returns 404 and their profile remains isolated.                                                                                                                                              |
| P1-15         | A configured administrator without a question version cannot be signed; no CUHK answer set is substituted.                                                                                                                                                                     |

`npm run typecheck` and `npm run build` pass for the TypeScript source and Cloudflare/TanStack production bundle. A Wrangler deployment dry run also passes (about 595 KiB compressed), without deploying or provisioning resources. CI runs `npm ci` and `npm run check`.

## Browser evidence

Local Chromium walkthrough at desktop 1440 × 1080 and mobile 390 × 844 covers registration, verified account access, saved particulars, both sample PDF uploads, the three-section wizard, typed acknowledgement/signature and the final receipt. The page reports no uncaught JavaScript errors and no horizontal document overflow. Supporting screenshots are local work artifacts, not applicant data or published pages.

## Demonstration walkthrough

1. Follow the local setup in README and register a synthetic account.
2. Use the private local developer outbox inspection to open its verification link. No bypass exists in the product UI.
3. Save required particulars. Leave optional names/phone blank if desired. Enter only four partial ID digits.
4. Upload the two files in `docs/samples/`. Set the practising-certificate year to the current Hong Kong calendar year and validity-end date to 31 December of that year. Observe “Uploaded — not verified”.
5. Open Enrolment. Select a current/upcoming cycle, answer the current-cycle previous-enrolment question, then CUHK and a truthful synthetic category. Save and reopen the draft.
6. Review particulars, dates, answers and document versions. Acknowledge the sample statement and type the full name. Save the attestation, then submit in Scribo.
7. Open the receipt. Observe the unique reference, immutable snapshot and explicit unconfirmed institution/pairing states. Retry the same submission with the same draft ID; it returns the existing receipt.
8. Edit particulars/upload a new version and reopen the old receipt. Its signed particulars and document references remain unchanged.
9. Repeat for the other cycle using the drawn signature. The typed method remains a keyboard-accessible alternative.
10. Run `npm run reminders:simulate -- 2026-12-01` with a 31 December 2026 certificate. Open Notifications. Repeat to demonstrate deduplication. Upload a future-year certificate and confirm it does not clear this year's requirement.

## Remaining decisions / limits

- Google OAuth and live Cloudflare sending require credentials, bindings, controlled recipients and provider acceptance checks. Their configuration is not a completed integration. No live emails or institutional requests were sent during implementation.
- The optional Email Routing adapter does not settle the final Cloudflare email-service choice. A D1 outbox cannot guarantee exactly-once external sending across a crash between provider handoff and local status persistence; provider idempotency/reconciliation is required for that stronger guarantee.
- File type/size/magic and active-PDF rejection are prototype checks, not malware scanning. A reviewed ingestion/scanning policy and retention/deletion workflow remain necessary before real documents.
- Collection-statement wording is a labelled sample. June–May cycles, effective-date bounds, licence-year/validity data and 30/7-day reminders retain their provisional product status.
- Cycle records are explicit, finite configuration; add reviewed future records instead of inferring a calendar indefinitely.
- No private remote environment was provisioned or deployed. Configure an HTTPS origin, private access gate, D1/R2 resources and Worker secrets separately.
- Institutional staff access, acceptance/rejection, pairing, external delivery, credit claims/scoring and all Phase 2 workflows remain outside this implementation.
