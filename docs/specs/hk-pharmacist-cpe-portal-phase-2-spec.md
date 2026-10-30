# Hong Kong Pharmacist CPE Activity Submissions

## Phase 2 specification

- Version: 1.1 revised scoped draft
- Prepared: 29 October 2026, Hong Kong time
- Product owner: Scribo Limited
- Dependency: Phase 1 pharmacist passport and enrolment foundation
- Purpose: Specify pharmacist reporting of CPE activities and requests for CPE points through category-specific submission forms.

- Phase 2 extends the Scribo-owned passport with submission records, supporting documents, declarations and receipts.
- Pharmacists report activities to their enrolled or paired CPE administrator.
- A request for points is distinct from an administrator's award of points.
- The phase does not automatically bring forward every institutional review and reporting feature in the earlier full specification.

- The administrator delivery channel and review interface remain to be agreed.
- Consequently, this document separates the form and case-record build from the external-delivery dependency.
- A private demonstration can use simulated enrolment and delivery.
- Actual submission to an administrator requires an agreed delivery route and destination; saving in Scribo alone must not be represented as delivery.

## 1. Scope and roles

### 1.1 Included

- A five-section submission wizard with current-cycle confirmation and review of prefilled passport information.
- Seven activity categories with activity-count-driven repeated forms, conditional fields and supporting documents.
- Privacy notices, an accuracy declaration, and typed or drawn signatures.
- Saved drafts and immutable submission snapshots.
- Pharmacist submission history and receipts.
- Recipient and delivery states recorded separately from local submission state.

### 1.2 Deferred from the earlier full specification

- Institutional access: staff portal, CUHK SSO, pairing acceptance and CUHK POST confirmation.
- Institutional review: credential adjudication, CPE approval/rejection and requests for further information.
- Credit and course management: automatic credit suggestions, a shared course catalogue and institutional rule administration.
- Reporting and operations: institutional audit reports, PDF/Excel activity-report exports, institutional email notifications and historical import.

- These were part of the earlier broader initiative, including confirmed “first version” features, but are not explicitly described in the new two-phase functional scope.
- They are deferred backlog requirements, not deleted decisions.
- One authorised CUHK reviewer and no second-review requirement remain the earlier full specification direction for a future adjudication phase.

- Routine draft validation and receipts support the scoped forms.
- They do not constitute an institutional case-review system.
- Payments, course enrolment, learning delivery and certificate issuance remain outside these phases.

### 1.3 Access and recipient selection

- The pharmacist creates and views their own submissions only.
- The recipient must be identified by an enrolment or pairing record for the reported cycle; submitting a claim must not allow an arbitrary institution ID supplied by the browser to bypass that relationship.

- Phase 1 does not create confirmed pairings.
- Allow users to prepare drafts while enrolment or credential verification is incomplete, consistent with the earlier full specification's separation of submission from approval.
- For a prototype, a selected submitted enrolment can identify the intended recipient, but the UI must label it as “Enrolment not confirmed”.
- Use clearly marked test enrolment fixtures to demonstrate a confirmed relationship; do not silently promote a Phase 1 application to accepted status.

- Whether an administrator accepts delivery before enrolment confirmation is unresolved.
- If that authority or route is missing, allow a local demonstration receipt only, showing “Not delivered to administrator”.
- Any future credit approval must require both verified credentials and confirmed pairing, as in earlier full specification Section 2.3.
- Neither is produced merely by this phase's submission form.

## 2. Five-section wizard

### 2.1 Section 1 CPE cycle

- Display the current configured cycle with full dates, using Hong Kong time, and require confirmation that the pharmacist is reporting for it.
- For example, on 29 October 2026 the demonstration cycle is 1 June 2026–31 May 2027.
- Do not copy the earlier full specification's July–June dates into this form.

- Only current-cycle reporting is described in the new scope.
- Previous-cycle late submission, future-cycle claims and cross-cycle attribution remain deferred policy decisions.
- Preserve explicit cycle IDs and configurable deadlines so the earlier requirement for administrator-set late submissions can be implemented later.
- Do not erase that requirement or hard-code an unconditional stop on the cycle end date.

- If the current cycle changes while a draft is open, retain the draft's original cycle and stop final submission with an explanation that its reporting window needs to be confirmed.
- Never silently transfer the draft into another cycle.

### 2.2 Section 2 Confirm personal particulars

- Prefill the following from the Phase 1 passport:

| Field | Requirement |
| --- | --- |
| Salutation | Mr., Ms., Miss, Dr. or Prof.; required |
| First name | Required |
| Last name as shown in ID card | Required |
| Name in Chinese | Optional |
| Pharmacist licence registration number | Required |
| Contact phone number | Optional |
| Email | Required |

- Ask the pharmacist to review and click Confirm before proceeding.
- Preferred name and the partial ID/passport number are not part of this personal-particulars confirmation section and must not be added to the submission or disclosed to the recipient by default.

- Implementation default: provide an “Edit passport” action for corrections.
- On return, reload the values and require confirmation again.
- Store a snapshot when the claim is submitted; later passport edits must not alter a submitted claim.
- If these profile values change between confirmation and final submission, require a fresh review.

### 2.3 Section 3 General reporting information

- Require exactly one activity category per submission:

1. Active CPE Activities (Local).
2. Active CPE Activities (Overseas).
3. Receptive CPE Activities (Local).
4. Receptive CPE Activities (Overseas).
5. Postgraduate Studies.
6. Self-study.
7. Publication.

- For every category except Postgraduate Studies, ask “What is the total number of activities for which you would like to claim CPE points?” Require a positive whole number.
- Generate that many numbered detail groups in Section 4, including for self-study and publication.
- No maximum count is specified; a configurable technical limit can be introduced after product review, but must not be presented as an institutional cap.

- Postgraduate Studies has no activity-count question and uses one programme detail group per submission as the implementation default.
- Multiple programmes can be separate submissions; this is not a rule limiting eligibility.

- When reducing the count or changing category, warn before removing entered details or attachments.
- Clear incompatible values from the active payload.
- Do not require hidden fields from a previous branch or include them in the signed submission.

### 2.4 Section 4 Activity details

- Render the fields specified under Category-specific field specifications below.
- Each required group must validate before final submission.
- At the end of the details section show a disclaimer explaining that personal data collected will be used by Scribo and authorised institutions or personnel for processing the stated purposes in accordance with relevant provisions of the Personal Data (Privacy) Ordinance.

- The named recipients, collection purposes and final notice text require approval.
- The demonstration must label any interim wording as sample text.
- Showing this notice does not itself establish legal compliance or permit unrestricted sharing.

### 2.5 Section 5 Declaration and signature

- Require all three of the following before submission:

- A tick confirming “I confirm the above information is accurate and correct”.
- Explicit acknowledgement of the applicable personal data collection statement.
- Either a typed full-name signature or a signature drawn in the provided area. Support both methods, with one sufficient for each submission.

- Store the declaration, statement version, signature method/value or private image reference, timestamp and exact submitted version.
- Any change to confirmed profile or claim content after signing invalidates that draft attestation and requires signature and acknowledgement again.
- This must also apply to Phase 1 enrolment attestations when implementing its final review.

- Include the requested data-access/correction information: applicants may make written requests to Scribo at team@scribo.com.hk, with links to the [Data Access Request Form](https://www.pcpd.org.hk/english/publications/files/Dforme.pdf) and [Scribo privacy policy](https://www.scribo.com.hk/en/privacy-policy-en).

- Label the privacy-policy link “Scribo’s policy on collection of personal data”, subject to final notice approval.
- Preserve the requested meaning about access and correction rights without claiming to have legally validated the text.
- Link destinations and current wording must be checked before real use; downloading or automatically sending either form is not part of this phase.

## 3. Category-specific field specifications

- Required and conditional fields are identified in the tables below.
- Keep optional fields optional; do not introduce extra mandatory fields without product confirmation.

### 3.1 Active CPE Activities Local

- Repeat this group for each declared activity:

| Field | Required | Options or validation |
| --- | --- | --- |
| Provider or accreditation classification | Yes | Organised by a CPE programme provider; An activity accredited by CPE administrator; None of the above. Single selection |
| Name of the CPE activity | Yes | Text |
| Name of the organiser | Yes | Text |
| Mode of delivery | Yes | Face-to-face; Online (Live); Hybrid; Other (Please specify). Single selection |
| Other delivery description | Conditional | Required only when Other is selected |
| Is this a multi-day activity? | Yes | Yes or No |
| Date | Conditional | Required when multi-day is No |
| Time From and Time To | Conditional | Required hour and minute inputs when multi-day is No |
| Date From and Date To | Conditional | Required when multi-day is Yes |
| Total CPE points requested for this activity | Yes | Numeric, no more than 10 |
| Proof upload | Yes | E.g. official invitation letter or attendance certificate; at least one file |

- Use a proposed lower bound of greater than zero for a claim; decimal precision is unresolved and must be configurable rather than inferred.
- The upper input limit is 10 for each local activity; this does not define a whole-cycle entitlement.

- For a single-day activity, use a valid date, hours 00–23 and minutes 00–59.
- End time must be later than start time under the prototype same-day interpretation.
- Overnight activities and the treatment of breaks require confirmation.
- For a multi-day activity require Date To to be on or after Date From; do not require hidden single-day time fields or infer attended hours from calendar days.

### 3.2 Receptive CPE Activities Local

- Use exactly the same field structure, requiredness, options, points-request input limit and conditional date/time behaviour as Section 3.1, with the category stored as Receptive rather than Active.
- Keep the category distinct for future rules and reporting.
- Identical fields do not imply identical award formulas.

### 3.3 Active CPE Activities Overseas

- Repeat this group for each declared overseas activity:

| Field | Required | Options or validation |
| --- | --- | --- |
| Overseas activity classification | Yes | Pre-approved Overseas CPE Activity; Activity Organised by Approved Overseas Organisation; None of the above. Single selection |
| Completed application form upload | Yes | Completed “Application Form for Claiming CPE Points for Completing CPE Activity Organised by Non-local Pharmacy Boards and Pharmacists’ Associations.” |
| Supporting proof upload | No | E.g. official invitation letters or attendance certificate; optional |

- Separate activity name, organiser, date, duration and points-request fields are outside the current overseas form scope.
- Do not invent mandatory fields or attempt to extract them automatically from uploaded documents.
- The completed form template and its authorised download location remain to be provided.
- A helper link may be configured when supplied; do not fabricate one.

### 3.4 Receptive CPE Activities Overseas

- Use the same classification and uploads as Section 3.3, storing Receptive as the category.
- Do not preselect a classification for the pharmacist.
- No question about a multi-day activity is required for overseas categories in this phase.

### 3.5 Postgraduate Studies

- Display the following postgraduate guidance, subject to administrator confirmation: postgraduate studies concern pharmacy or relevant subjects, such as clinical pharmacy, Chinese medicine and public health.
- The provisional rate is one CPE point per attendance hour, capped at 15 points per cycle.
- Courses must be offered by recognised higher education institutions and deemed equivalent to Hong Kong Qualifications Framework Level 6 or above.
- Do not treat this guidance as an independently verified eligibility decision.

| Field | Required | Options or validation |
| --- | --- | --- |
| Level of studies | Yes | Master; Doctoral; Postgraduate certificate / diploma; Other |
| Other level description | Conditional | Required if Other is selected |
| Name of the programme | Yes | Text |
| Institutions | Yes | Text |
| Study mode | Yes | Full-time or Part-time; single selection |
| Programme/course start date | Yes | Valid date |
| Programme/course end date | Yes | On or after start date |
| Total number of attendance | Yes | Dropdown; options and units pending confirmation |
| Programme/course evidence upload | Yes | Transcript, admission letter or certifying letter; at least one file |

- Do not interpret “total number of attendance” as hours or supply a fabricated dropdown range.
- Implement the field as configurable; for a demonstration use visibly labelled test options only.
- Its intended unit and real option list must be confirmed before real submissions.
- Do not include a separate points-request field or category activity-count question.

### 3.6 Self-study

- Display provisional self-study guidance covering approved reading materials; accredited self-assessment programmes from CPE programme providers or accredited overseas institutions/professional bodies; and online study including audio, on-demand video and digital articles.

- The provisional guidance requires dates, time spent and studied materials to be recorded in sufficient detail, at one point per actual hour.
- It allows a maximum of 7 points per cycle where a reflection report of at least 500 words is submitted or passing a self-assessment is required for completion, and a maximum of 3 otherwise, with an overall self-study maximum of 7 per cycle.
- Confirm this guidance with the administrator; do not implement it as automatic award rules in this phase.

- Repeat the following for each declared self-study activity:

| Field | Required | Options or validation |
| --- | --- | --- |
| Completed self-study report upload | Yes | Completed “Report Form for Self-study CPE Activities” |
| Reflection report or passed self-assessment | Yes | I have a reflection report; I have completed and passed a self-assessment; No. Single selection |

- Separate reflection-report uploads, assessment proof uploads, study-hours fields and points-request fields are not mandatory in the current form scope.
- Whether reflection/assessment evidence is included in the report form or needs a new upload is unresolved.
- The report template and download source must also be supplied.
- Do not claim a declaration has verified a 500-word threshold or a passing result.

### 3.7 Publication

- Display provisional publication guidance covering papers/reports on pharmaceutical care, academic interests and/or public health published in professional journals, books and newsletters of professional bodies and accepted/approved by CPE administrators.
- The provisional rate is 10 points per publication.
- Exclude coursework, research, thesis, dissertation or equivalent work serving as a mandatory postgraduate-study requirement.
- Institutional acceptance and the complete rules still require confirmation.

- Repeat for each declared publication:

| Field | Required | Options or validation |
| --- | --- | --- |
| Name of the publication | Yes | Text |
| Publication date | Yes | Valid date |

- Uploads, author lists, URLs, journal fields and points-request fields are not mandatory in the current publication form scope.
- Whether supplementary evidence or eligibility declarations are needed is a feedback item.

### 3.8 Cross-category validation and missing data

- Each submission has one category and the exact declared number of detail groups, except the one-programme postgraduate default.
- Validate requiredness and options on the server, including conditional values and attachment ownership.
- A file attached to another account or an unrelated draft must never be accepted by reference alone.

- Do not impose local activity fields on overseas, self-study or publication forms.
- For categories with explicit dates, flag dates outside the selected cycle for review rather than inventing an attribution rule for multi-day courses or programmes spanning cycles.
- The final block/allow policy is unresolved.
- Overseas and self-study dates may exist only in uploaded forms; automated cycle-attribution validation is not possible without additional agreed fields or manual review.
- Do not pretend to have checked them.

## 4. Points semantics and deferred calculations

| Value | Phase 2 treatment |
| --- | --- |
| Requested points | Entered per local activity only; do not add numeric requests in other categories |
| Suggested points | Not calculated in this reduced phase; retain a separate future concept |
| Approved points | Not awarded or inferred; absent until an authorised institutional decision exists |
| Reference rates and caps | Display with a guidance version and pending-policy status; not represented as current verified law |

- The full scoring rules remain incomplete.
- In particular, overseas form contents, postgraduate attendance units, self-study evidence and cross-activity/cycle rules are incomplete.
- Publication and postgraduate reference rates must not become awarded credits automatically.
- Do not show a full-cycle total as though all categories had been assessed.
- If displaying a total of local requests, label it as that partial requested amount only; missing values are unknown, not zero.

- Automatic suggestions based on category/duration remain a deferred feature from the earlier full specification.
- Preserve separate requested, suggested and approved values in future-compatible modelling.
- A later rules module must be versioned and must not rewrite earlier submissions or decisions silently.

## 5. Submission lifecycle and delivery

### 5.1 Draft and final submission

- Save progress between sections.
- Let the pharmacist review the full payload and attachment names before signing.
- Server-side final submission checks ownership, selected cycle, recipient reference, confirmed profile version, count, active category fields, completed uploads and fresh declaration/signature.

- Use a single submission reference and an idempotency key.
- Store the complete snapshot and receipt atomically, then run any notifications or delivery asynchronously.
- A network retry must not create another claim.
- Validation failures must preserve entered draft information and identify the affected group/field.

### 5.2 Separate state dimensions

| Dimension | Scoped values | Meaning |
| --- | --- | --- |
| Local claim state | Draft, Submitted | Whether the pharmacist has finalised a record in Scribo |
| Delivery state | Not configured, Queued, Sent, Acknowledged, Failed | External handoff state, only where a real route is agreed and implemented |
| Enrolment/pairing state | Referenced independently | A local claim never confirms enrolment |
| Credit decision | Not assessed | No points approval engine or institutional review UI in the scoped build |

- “Sent” means successful handoff through the selected channel, not proof of institutional receipt or acceptance.
- “Acknowledged” requires evidence defined by the agreed channel.
- A prototype delivery simulation must be visibly labelled and must never create a live-looking acknowledgement.

- Submitted content is read-only in this reduced phase.
- Correction, withdrawal and resubmission procedures must be agreed before live use; do not overwrite a signed snapshot.
- These remain separate from the earlier full specification's proposed institutional return/reject/correct workflow.

### 5.3 Administrator delivery dependency

- Before real external delivery, agree the authorised administrator, recipient endpoint or contact, whether the recipient accepts unconfirmed enrolment, payload and attachment format, disclosure authority, acknowledgement meaning, authentication, retries and duplicate handling.
- The recipient must see only the submitted information and authorised attachments, not the entire passport or other institutions' records.

- Email handoff, API integration and a staff portal are alternative future delivery choices.
- The delivery method remains to be agreed; do not assume one.
- Build the local submission core with a delivery interface that is disabled until configured.
- If a later choice adds a portal or API, scope and validate that integration separately.
- Until a channel is agreed, end-to-end real submission remains incomplete and the result is explicitly a demonstration.

## 6. Receipts and notifications

- Provide an in-app receipt showing reference, cycle, intended administrator, category, number of entries, submission time, declaration/signature method and clear local/delivery/assessment states.
- Provide the owner with read-only history and details.
- A receipt is not a formal CPE activity report or awarded-points statement.

- Carry forward the earlier full specification's pharmacist submission-confirmation email as a supporting requirement.
- Immediate dispatch is an implementation default, not a newly confirmed policy.
- It must link to the authenticated receipt and contain no sensitive attachments, partial ID or signature image.
- Failures and retries do not alter the saved claim or duplicate the email event.
- Use test recipients during demonstration.

- Cycle-end reminders, late-submission reminders, institution staff alerts, approval results, approved-credit notices and requests for further documents are deferred until their deadlines and workflows are in scope.
- Phase 1 practising-certificate reminders continue independently.

## 7. Data model and service boundaries

- Reuse Phase 1 User, PharmacistProfile, CredentialDocument, Institution, CPECycle, EnrolmentApplication, private files, notifications and audit events.

| New entity | Minimum contents |
| --- | --- |
| CPEClaim | Owner, cycle, intended institution, enrolment/pairing reference, category, declared count, local state, submission reference, version and timestamps |
| ClaimProfileSnapshot | Only the Section 2 profile fields, source profile version and confirmation timestamp |
| ActivityEntry | Claim ID, sequence number, category-specific answers and schema version |
| ClaimAttachment | Entry/field purpose, private file ID, owner and document version |
| ClaimAttestation | Accuracy confirmation, statement version, signature method/reference, signed version and timestamp |
| DeliveryAttempt | Claim ID, route/configuration version, attempt state, time, error and any acknowledgement reference; disabled in demo unless simulated |

- Use distinct categories and stable option codes with display labels; store question and guidance versions.
- Avoid one large free-text field for answers that must be validated.
- Store structured dates and times separately from display formatting.
- Preserve source document/version references so future verification can refer to the correct evidence.

- Logical operations are: create draft, load own draft, save section with expected version, attach/remove own draft file, confirm profile, validate, sign/finalise idempotently, list own submissions, read own snapshot, and retrieve own receipt.
- Final submission is server-authoritative; clients cannot set delivered, paired, verified or approved states.

- Prepare future separate award decisions and pairing confirmations without exposing fake approval actions.
- Do not build the deferred scoring, catalogue or institution APIs simply because the earlier specification discussed them.

## 8. Interface and implementation requirements

- Continue the Phase 1 technical direction and privacy controls.
- The earlier full specification's Cloudflare service names and email capabilities still require technical validation; this document does not settle “R1 D2”.
- No live provider or institution integration is presumed.

- Use a responsive wizard with progress labels, numbered activity groups, accessible radio buttons, date/time inputs, upload progress, inline validation, Back/Next navigation and a final review.
- No preselected category, classification, accuracy checkbox or consent is permitted.
- Optional fields must be labelled clearly.
- Support mobile uploads and a keyboard-accessible typed-signature alternative.

- Use the Phase 1 proposed PDF/JPEG/PNG and configurable 10 MiB upload defaults, subject to actual template needs.
- Authorise all file access, validate types/content, keep storage private, avoid raw personal data in logs and ensure errors do not leak another user's records.
- Reuse draft version checks and deduplicated notifications.

- For demonstrations use synthetic profiles, sample forms and evidence, disabled external delivery, controlled test emails and clear simulation labels.
- Institutional visibility, retention and production safeguards require separate agreement; demonstration completion is not a live launch authorisation.

## 9. Acceptance scenarios

| ID | Scenario and expected result |
| --- | --- |
| P2-01 | Open a new claim; confirm the configured June–May current cycle and reviewed profile before progressing |
| P2-02 | Profile data changes after confirmation; final submission requires reconfirmation and a fresh signature |
| P2-03 | Select each of seven categories; exactly its fields appear. Count is required for six categories and absent for Postgraduate Studies |
| P2-04 | Enter three activities; three numbered groups are required. Reducing count or changing category warns before data removal and excludes stale fields |
| P2-05 | Test Active Local and Receptive Local; all classifications and delivery choices appear, Other requires text, and proof is mandatory |
| P2-06 | Select single-day local activity; require date/hour/minute start and end. Select multi-day; require From/To dates and no hidden time fields |
| P2-07 | Enter a local points request above 10 or a non-number; reject it. Accept valid values without marking them approved |
| P2-08 | Test both Overseas categories; completed application form is mandatory and supporting proof is optional. No example radio choice is preselected |
| P2-09 | Test Postgraduate Studies; require all specified fields and evidence, Other requires text, and attendance options are configurable and visibly provisional until supplied |
| P2-10 | Test Self-study; require a report and one of the three declarations. Do not silently add mandatory reflection evidence or award credits |
| P2-11 | Test Publication; require name and date for each entry without adding an unsupported mandatory upload |
| P2-12 | Leave accuracy, acknowledgement or signature incomplete; reject submission. Demonstrate both typed and drawn signatures in separate tests |
| P2-13 | Submit or retry twice; create one claim and receipt, preserve the signed snapshot and send at most one event email |
| P2-14 | Use an unconfirmed enrolment with no delivery route; show a local demonstration submission and Not delivered, with no accepted pairing or awarded points |
| P2-15 | Use a controlled delivery fixture; demonstrate Queued/Sent/Acknowledged/Failed separately from local Submitted, with simulated states labelled |
| P2-16 | Request another user's claim or attachment, or attach their file ID; deny access server-side |
| P2-17 | Reopen after the current-cycle boundary or enter cross-cycle dates; preserve data and flag the unresolved window/attribution policy instead of silently moving cycles |
| P2-18 | Edit passport or upload newer credentials after submitting; the original claim snapshot and attachments remain unchanged |

## 10. Decisions required for real use

| Ref. | Unresolved item | Consequence |
| --- | --- | --- |
| P2-D01 | Confirm June–May versus the July–June cycle in the earlier full specification, attribution dates and cross-cycle handling | Prototype uses new dates; no official historical allocation inferred |
| P2-D02 | Decide late-submission windows, cycle-boundary drafts and correction/withdrawal procedure | Current-cycle demo only; late-submission requirement from the earlier full specification remains backlog |
| P2-D03 | Agree recipient eligibility, enrolment acceptance, real delivery channel and acknowledgement | Local form completion is possible; real administrator submission remains dependent |
| P2-D04 | Supply postgraduate attendance units and dropdown options | Use test configuration only until resolved |
| P2-D05 | Supply overseas and self-study blank forms and authorised download sources | Demonstrate uploads with labelled sample files; do not fabricate official templates |
| P2-D06 | Confirm provisional credit guidance, points precision, eligibility and supporting-evidence requirements | No complete scoring or awarded-credit totals |
| P2-D07 | Approve collection statements, confirm Scribo policy wording, links, sharing and retention | Use sample notices and synthetic data until approved for actual collection |
| P2-D08 | Decide treatment of activities with no structured dates/points in the current forms | Do not infer missing data or claim automated checks |
| P2-D09 | Confirm whether a future phase includes institutional review, catalogue, suggestions and reporting | Those features from the earlier full specification are preserved as backlog, outside this build |

## 11. Delivery and completion gate

- Deliver the source, database changes compatible with Phase 1, configuration/seed instructions, sample files, walkthrough and acceptance evidence.
- The walkthrough must cover all seven categories, both local date branches, both signature methods, incomplete enrolment, submission retries and private-file access.

- The Phase 2 prototype is complete when the five-section workflow and local submission record work correctly and dependencies are explicit.
- Describe it as a submission demonstration while external delivery remains unresolved.
- Actual pharmacist-to-administrator delivery is complete only after the agreed route works with authorised recipients and meaningful receipt evidence.
- Neither milestone is an administrator's approval of CPE credits or a production launch.

## 12. Traceability and future work

| Earlier full specification area | Treatment in the staged approach |
| --- | --- |
| Sections 2–2.3 roles, pairing and verification | Reuse separate identities/states; institutional confirmation remains a dependency |
| Sections 3.0–3.1 login and credentials | Implemented through Phase 1; Phase 2 reuses snapshots without institutional verification |
| Section 3.2 CPE details and credit review | This phase implements reporting and points requests; adjudication remains future scope |
| Section 3.2.1 automatic suggestions | Deferred; the full scoring rules remain unresolved |
| Section 3.2.2 single authorised approver | Preserve for future institutional review; no approver UI in this phase |
| Section 3.2.3 shared course catalogue | Deferred; manual category forms operate without a catalogue |
| Section 3.3 notifications | Renewal reminders in Phase 1 and submission receipts here; remaining institutional/result/deadline notifications deferred |
| Sections 3.4–3.5 reporting and cycles | Explicit configurable cycle model retained; formal reports and late-submission workflow deferred; newer June–May dates used for demo |
| Section 4 technology | Reuse direction, with service and integration choices still pending |
| Sections 5–7 unresolved policy and handover | Carry forward only relevant dependencies and use phase-specific acceptance gates |
