# Hong Kong Pharmacist Digital CPE Passport

## Phase 1 specification

- Version: 1.1 revised scoped draft
- Prepared: 29 October 2026, Hong Kong time
- Product owner: Scribo Limited
- Purpose: Specify the pharmacist account, personal passport, qualification documents, renewal reminders and CPE administrator enrolment application for a non-production demonstration and stakeholder feedback.

- Phase 1 establishes a Scribo-owned application independent of CUHK and other CPE administrators.
- It lets pharmacists maintain their information and prepare and submit an enrolment application within the application.
- Completion is a foundation for discussion with CUHK and other administrators; it is not a production launch or an institutional acceptance of an application.

## 1. Scope and delivery boundary

### 1.1 Included

- Email and password registration and login, and Google sign-in.
- A pharmacist-owned passport containing personal and qualification particulars.
- Mandatory registration-certificate and annual practising-certificate uploads for a completed passport.
- In-app and email reminders to upload an updated practising certificate.
- A three-section enrolment application, including cycle selection, previous enrolment information, administrator-specific questions, acknowledgement and signature.
- Saved drafts, validation, an immutable submitted application and a submission receipt as implementation defaults supporting these functions.

### 1.2 Deferred

- CPE activity reporting and points claims belong to Phase 2.
- Institutional staff accounts, CUHK SSO, manual credential verification, enrolment acceptance or rejection, confirmed pairing, CUHK POST integration, automatic points calculations, shared course catalogue, formal reports, institutional notifications and administrator review tools are outside Phase 1.

- Also excluded are payments, course registration, online learning, attendance tracking, electronic certificate issuance and legacy data import.
- No production availability, institutional endorsement or regulatory compliance certification is implied by prototype completion.

### 1.3 Ownership and permissions

- Scribo operates the application.
- A pharmacist may access only their own passport, documents, drafts, submitted applications and notifications.
- Selecting an institution does not grant that institution access.
- Future institutional access must be authorised through a separately agreed workflow and data-sharing arrangement.

- Prototype configuration may define administrators, cycles, questions, statements and reminder schedules.
- A configuration file or seed process is sufficient; an administrator portal is not required.
- Any developer support access must be restricted and recorded rather than exposed as a pharmacist feature.

## 2. Account and authentication

### 2.1 Required behaviour

- Provide email and password registration, login and logout, plus Google sign-in.

- Authentication establishes account access only.
- It does not verify professional eligibility, certificates or pairing.
- Interface status labels must distinguish these matters.

### 2.2 Implementation defaults

- Verify control of an email address before final enrolment submission.
- Provide password reset through a single-use, expiring link.
- Use secure session handling, rate limits and server-side authorisation.
- Never store plaintext passwords.

- Google identity must be bound to its provider identity identifier.
- Do not silently merge existing accounts on the basis of a matching email address.
- Require proof of control of the existing account before linking login methods.
- Login email changes require verification and must not overwrite email values in submitted snapshots.

- Account creation may precede completion of profile and certificate uploads.
- The dashboard must show outstanding requirements and allow the pharmacist to resume.
- Requiring a complete passport before enrolment submission is a proposed sequencing default, not an institution's credential-verification policy.

## 3. Passport fields

### 3.1 Personal particulars

| Field | Required | Behaviour |
| --- | --- | --- |
| Salutation | Yes | Single selection: Mr., Ms., Miss, Dr. or Prof. |
| First name | Yes | Preserve the pharmacist's entered spelling |
| Last name as shown in ID card | Yes | Explicitly label this requirement |
| Name in Chinese | No | Unicode text |
| Preferred name | No | Separate from legal-name fields |
| Contact phone number | No | Store as text; allow an international prefix |
| Email | Yes | Prefill from account; maintain one verified contact email as the prototype default |
| First four digits of ID card or passport number | Yes | Collect only the requested partial identifier, never the full number |

- Do not use this partial identifier as a password, account-recovery answer or unique account key.

### 3.2 Qualification particulars

| Field or document | Required | Behaviour |
| --- | --- | --- |
| Pharmacist licence registration number | Yes | Text value; formatting and uniqueness rules await confirmation |
| Pharmacist registration certificate | Yes | Upload a scanned or digital copy |
| Annual practising certificate | Yes | Upload a scanned or digital copy; associate it with a licence year |

- Uploading a certificate records receipt only.
- Display “Uploaded — not verified” rather than “Verified”.
- No automatic OCR or professional-register check is required.

- As an implementation default, collect the practising-certificate licence year and validity-end date alongside the upload so that reminders can run.
- These metadata fields support reminder scheduling.
- The licence-year model remains separate from the CPE-cycle model.
- The earlier full specification's January–December licence year is retained as a user-supplied product assumption, not independently verified law.

### 3.3 Document management

- Allow the owner to upload, preview and download their own files.
- A new annual practising certificate creates a new version linked to its year rather than destroying the previous year's document.
- Unsubmitted draft attachments can be replaced.
- Submitted applications retain references to the exact document versions used at submission.

- Prototype default: PDF, JPEG and PNG files, with a configurable 10 MiB limit per file.
- Validate content type and size on the server; reject unsafe content, use private storage and authorise every download.
- These formats and limits are implementation choices, not administrator requirements.
- Do not place identity documents or certificate attachments in email messages.

## 4. Practising certificate reminders

### 4.1 Required reminders

- Provide both an in-app reminder and an email reminder asking pharmacists to upload an updated annual practising certificate.
- This requirement concerns renewal uploads, not institutional verification or CPE-cycle completion.

### 4.2 Proposed demonstration schedule

- Use configurable reminders 30 and 7 days before the recorded validity-end date, plus one reminder when the certificate has expired and no replacement is recorded.
- The earlier full specification's reminder lead times were proposals; they are still not confirmed policy.

- The dashboard should also show a persistent “Practising certificate missing” or “Update required” message when applicable.
- If the validity-end date is absent, show that the date must be completed; do not invent a deadline.

- Each notification records the recipient, certificate version, trigger date, channel and delivery status.
- Use an event key to avoid duplicate sends on scheduler retries.
- Retry temporary email failures without undoing the saved in-app notification.
- Uploading the applicable replacement suppresses pending reminders for the superseded document; a future-year upload must not incorrectly clear a missing current-year certificate.

- Prototype emails must go only to controlled test recipients.
- A developer-triggered simulated date is sufficient to demonstrate scheduling without waiting for a real expiry.

## 5. Enrolment application

### 5.1 Section 1 General information

- Require the pharmacist to select the current or upcoming CPE cycle and answer:

- “In the current CPE cycle, have you enrolled with other CPE administrator(s)?”

- Use a required Yes/No answer.
- If Yes, require the effective date of the new enrolment.
- Keep the question about the current cycle even when the chosen application cycle is upcoming; confirm whether different wording is intended before production.

- Use a CPE cycle of 1 June to 31 May of the following year for this phase; the earlier full specification used 1 July to 30 June.
- Use explicit, configurable cycle records and the newer June–May dates for this prototype.
- For example, on 29 October 2026 the current cycle is 1 June 2026–31 May 2027 and the upcoming cycle is 1 June 2027–31 May 2028.
- Display full dates, not only an ambiguous year label.
- Confirm the cycle dates before production or historical migration.

- Use Hong Kong time to determine the current cycle.
- Do not hard-code cycle dates into enrolment or licence logic.
- Proposed validation: the new enrolment effective date must fall within the selected cycle; flag the rule for confirmation because switching policy is unresolved.

### 5.2 Section 2 Administrator and specific questions

- Require selection of one CPE administrator.
- Maintain an extensible institution registry with a separate, versioned enrolment question set for each administrator.
- Only the administrator-specific question and answer options for CUHK School of Pharmacy are currently known.
- Questions for every other CPE administrator remain pending confirmation from that respective administrator; do not reuse CUHK questions or invent questions for them.
- Configure CUHK SOP for the initial build; which other institutions can be listed or receive applications remains unconfirmed.

- For CUHK SOP, require one response to “Which category do you belong to?” using exactly these options:

1. Current full-time staff of School of Pharmacy, CUHK.
2. Current adjunct / honorary staff of School of Pharmacy, CUHK.
3. Current students of Master of Clinical Pharmacy (MCP) programme offered by the School of Pharmacy, CUHK.
4. Current Staff of CUHK Medical Center.
5. Current full-time staff of CUHK.

- There is no “None of the above” option in the current CUHK question set.
- Do not add one or infer that every pharmacist is eligible.
- An applicant who cannot truthfully choose an option can save a draft, but cannot complete this required question until the institution's eligibility wording is clarified.

- Changing the selected administrator loads that institution's questions and removes incompatible answers from the active application after warning the user.
- Submitted applications keep the institution and question version originally used.

### 5.3 Section 3 Acknowledgement and signature

- Show the applicable personal data collection statement.
- Require an explicit acknowledgement and either a typed full-name signature or a signature drawn in the provided area.
- Both input methods must be supported, with one sufficient per application.
- A blank canvas, empty name or unacknowledged statement blocks submission.

- Store the signature method and value or private image reference, acknowledgement timestamp, statement version and submitted application version.
- Changes to application answers, the relevant profile or document versions, or the statement after signing invalidate the draft attestation and require a fresh acknowledgement and signature before final submission.
- A signature is an attestation within this workflow; do not describe it as certified identity verification or a qualified digital signature.

- The final statement text remains pending.
- For the private demonstration, use a clearly marked sample statement and test data.
- Final wording, the named data user and any institutional disclosure must be settled before collecting real applicant data or forwarding applications.

### 5.4 Submission and receipt

- Implementation default: save drafts through all three sections, allow review and correction, then validate and submit in one atomic operation.
- Repeated clicks or a network retry must create one submitted application and one receipt, not duplicates.

- The receipt shows a unique reference, selected institution, selected cycle, submission time and “Submitted in Scribo — administrator acceptance not confirmed”.
- Preserve a snapshot of the relevant profile, qualification documents, answers, statement and signature.
- Later profile edits must not silently amend it.

- Phase 1 submission means persistence in Scribo for the demonstration.
- It must not claim that CUHK has received or accepted the application.
- External delivery, recipient identity, receipt acknowledgement and a valid confirmation channel are unresolved dependencies.
- Do not send institutional emails or enable external transmission as part of this specification task.

### 5.5 Enrolment versus pairing

- Keep the application state separate from the pairing state:

| Record | Phase 1 states | Meaning |
| --- | --- | --- |
| Enrolment application | Draft, Submitted | User preparation and submission within Scribo |
| Certificate | Missing, Uploaded unverified | Document presence only |
| Pairing | Not confirmed | No authorised institutional confirmation implemented |

- The restriction in the earlier full specification of one active CPE administrator at a time remains a future business constraint.
- A submitted application, an upcoming-cycle request or a declared effective date does not create or end an active pairing.
- Do not automatically terminate a previous relationship.
- Preserve applications by cycle to support later switching policy without overlapping confirmed active pairings.

- Withdrawal, institutional rejection, acceptance, annual reconfirmation and correction of submitted applications require later workflow decisions.
- For this phase, submitted records are read-only; a duplicate applicant/cycle/institution submission should be prevented with an instruction to retain the existing reference.

## 6. Minimum screens and shared data model

### 6.1 Screens

- Account registration and login.
- Passport dashboard with completion checklist.
- Personal particulars editor.
- Qualification documents and versions.
- In-app notifications.
- Enrolment wizard and review.
- Application receipt and history.
- Use accessible labels, keyboard operation, clear validation and responsive layouts suitable for mobile document uploads.

- An English interface is sufficient as a demonstration working assumption.
- Traditional Chinese/English switching was proposed in the earlier full specification but never confirmed; retain translatable labels without representing bilingual delivery as approved scope.

### 6.2 Logical entities

| Entity | Minimum contents |
| --- | --- |
| User and AuthIdentity | Internal user ID, verified contact email, provider identity, account state |
| PharmacistProfile | Owner ID and the personal and qualification text fields listed above |
| CredentialDocument | Owner, type, licence year, validity metadata, private file reference, version, upload time, verification state |
| Institution and QuestionSet | Stable ID, display name, enabled state, versioned questions and options |
| CPECycle | Stable ID, label, explicit start/end dates, timezone and configuration version |
| EnrolmentApplication | Owner, institution, cycle, prior-enrolment response, effective date, answers, state and submission reference |
| SubmissionSnapshot and Attestation | Profile/document versions, question version, statement version, signature and timestamp |
| Notification | Owner, channel, event key, scheduled/sent time and delivery state |
| AuditEvent | Actor, action, object ID, time and version references, excluding raw sensitive content |

- A future Pairing record is a separate relationship with institution, effective dates, confirmation source and status.
- Phase 1 must not manufacture confirmed records.
- Institutional credential-verification decisions must likewise remain separate from uploaded documents.

### 6.3 Service behaviour

- All profile, document, notification and enrolment operations require owner authorisation on the server.
- Save-draft operations use a version check to prevent silent overwrite from another browser tab.
- Final submission validates the latest draft version and stores its snapshot atomically.
- Notification sending runs after successful persistence and can retry independently.

## 7. Technical continuity and demonstration controls

- Retain the earlier full specification’s direction of TanStack Start and Cloudflare Workers.
- Database, object storage, identity library and email-service choices require implementation validation.
- The earlier full specification's “R1 D2” wording remains unresolved; D1 and R2 are candidates, not approved corrections.
- This specification does not assert current provider capabilities or require a new technical stack.

- Keep account, passport, enrolment and notification concerns distinct so Phase 2 can reuse them.
- Use stable IDs and versioned records.
- Avoid embedding CUHK-specific fields directly into the user-account schema.

- Use a private non-production environment, synthetic identity and certificate documents, controlled email recipients and visible demonstration labels.
- Provide seed/reset instructions and no live institutional integrations.
- Preserve security boundaries even in the prototype; a publicly accessible file bucket is not an acceptable shortcut.

## 8. Acceptance scenarios

| ID | Scenario and expected result |
| --- | --- |
| P1-01 | Register and log in with email/password; verify email and recover a password without creating a duplicate account |
| P1-02 | Sign in through Google; a matching existing email does not silently merge accounts |
| P1-03 | Save a partial passport, return later and complete every required field; optional fields remain optional |
| P1-04 | Omit either certificate; the passport stays incomplete and enrolment submission is blocked under the stated sequencing proposal |
| P1-05 | Upload both certificates; the dashboard shows uploaded, unverified documents and no confirmed pairing |
| P1-06 | Upload a new annual certificate; the earlier version remains accessible only to its owner and submitted snapshots retain their original version |
| P1-07 | Simulate renewal dates; one in-app and one test-email reminder are produced per configured event, retries do not duplicate them, and an applicable update suppresses pending reminders |
| P1-08 | Start enrolment; current/upcoming June–May dates display correctly, while licence-year dates remain separate |
| P1-09 | Answer Yes to previous enrolment; the effective-date field becomes required. Answer No; stale hidden values are excluded |
| P1-10 | Choose CUHK; exactly the five CUHK categories appear with one answer allowed; an unmatched applicant is not assigned a fabricated category |
| P1-11 | Submit using typed signature, then in another test application using drawn signature; missing acknowledgement or blank signature is rejected |
| P1-12 | Double-click submit or retry after a network interruption; one application and receipt result, showing no institutional acceptance |
| P1-13 | Edit the profile after submission; the earlier application and signed snapshot remain unchanged |
| P1-14 | Attempt to read another user's file, profile or application through a direct URL or request; access is denied |
| P1-15 | Add an administrator without a confirmed question set; do not populate it with CUHK questions or treat its questions as confirmed |

## 9. Unresolved decisions and completion gate

| Ref. | Decision | Effect |
| --- | --- | --- |
| P1-D01 | Confirm June–May versus the earlier full specification's July–June cycle | Use the newer dates in the demo; resolve before real records or historical conversion |
| P1-D03 | Confirm certificate validity metadata and reminder timing | Use labelled demo defaults; settle before live reminders |
| P1-D04 | Approve collection statements, signature wording, retention and support access | Use synthetic data and sample statements until resolved |
| P1-D05 | Confirm selectable institutions, each administrator’s enrolment questions, and handling of applicants outside CUHK categories | Only CUHK questions are currently known; other administrators must confirm their own questions |
| P1-D06 | Agree external enrolment delivery, confirmation authority and switching rules | Store local submissions only; no confirmed pairing |
| P1-D07 | Confirm language scope and technical service choices | Do not promote earlier full specification proposals into approved requirements |

- Phase 1 is complete when the included screens and acceptance scenarios work in a private demonstration, unresolved matters are recorded, and the build can be shown to stakeholders for feedback.
- Deliver the source, setup/seed instructions, test evidence and known limitations.
- Production readiness and Phase 2 implementation are separate decisions.

## 10. Traceability to the earlier full specification

- Earlier full specification Sections 2 and 2.1 inform pharmacist ownership, institution extensibility and eventual single-active-pairing constraints.
- Sections 2.2–2.3 remain integration and verification dependencies.
- Sections 3.0–3.1 supply authentication and credential concepts; institutional review is deferred.
- Section 3.3 contributes renewal reminders, while workflow-result and institutional notifications await their workflows.
- Section 3.5 supplies separate licence/cycle modelling, with the newer cycle dates taking precedence for demonstration.
- Section 4 remains technical direction rather than a final services decision.

- Earlier full specification Sections 3.2–3.2.3 and 3.4 do not expand Phase 1 into credit adjudication, course management or reporting.
- Their future treatment is set out in the Phase 2 specification.
