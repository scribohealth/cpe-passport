import { useCallback, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  Save,
} from "lucide-react";
import { hkDate, institutions, statement } from "../shared/config";
import type {
  Application,
  Attestation,
  Bootstrap,
  DraftValues,
} from "../shared/model";
import { Signature, DrawnSignature } from "./Signature";
import { PageHeading, formatDate } from "./Portal";
import type { Task } from "./Portal";
import { json, request } from "./client";

export function Enrolment({
  application,
  data,
  cycles,
  task,
  busy,
}: {
  application: Application;
  data: Bootstrap;
  cycles: { id: string; start: string; end: string; label: string }[];
  task: Task;
  busy: boolean;
}) {
  const [answers, setAnswers] = useState<DraftValues>(application.data);
  const [step, setStep] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [signature, setSignature] = useState<
    Pick<Attestation, "method" | "value">
  >({ method: "typed", value: "" });
  const updateSignature = useCallback(
    (value: Pick<Attestation, "method" | "value">) => {
      setSignature(value);
    },
    [],
  );
  const [reviewed, setReviewed] = useState(false);
  const institution = institutions.find((i) => i.id === answers.institutionId);
  const cycle = cycles.find((c) => c.id === answers.cycleId);
  const change = (value: Partial<DraftValues>) => {
    setAnswers({ ...answers, ...value });
    setAcknowledged(false);
    setReviewed(false);
  };
  async function save() {
    return request<Application>(
      `/api/applications/${application.id}`,
      json("PUT", { data: answers, expectedVersion: application.version }),
    );
  }
  async function next(target: number) {
    await task(async () => {
      await save();
      setStep(target);
    }, "Draft saved.");
  }
  async function sign() {
    await task(async () => {
      const saved = await save();
      await request(
        `/api/applications/${application.id}/sign`,
        json("POST", {
          expectedVersion: saved.version,
          acknowledged,
          ...signature,
        }),
      );
      setReviewed(true);
    }, "Acknowledgement and signature saved. Review the final submission action below.");
  }
  async function submit() {
    await task(async () => {
      await request(
        `/api/applications/${application.id}/submit`,
        json("POST", { expectedVersion: application.version }),
      );
    }, "Submitted in Scribo. Administrator acceptance is not confirmed.");
  }
  return (
    <>
      <PageHeading
        eyebrow="CPE ADMINISTRATOR ENROLMENT"
        title="Your next cycle starts here"
        description="A saved draft is yours to revisit. Submission records the application in Scribo only."
      />
      <ol className="wizard-steps">
        {["General information", "Administrator", "Acknowledgement"].map(
          (label, index) => (
            <li
              key={label}
              className={
                step === index ? "current" : step > index ? "complete" : ""
              }
            >
              <button disabled={busy} onClick={() => void next(index)}>
                <span>{step > index ? <Check size={14} /> : index + 1}</span>
                {label}
              </button>
            </li>
          ),
        )}
      </ol>
      <section className="panel form-panel wizard-panel">
        {step === 0 && (
          <>
            <div className="form-section-heading">
              <span className="step-label">01</span>
              <div>
                <h2>General information</h2>
                <p>
                  Choose your cycle and tell us about your current enrolment.
                </p>
              </div>
            </div>
            <div>
              <label htmlFor="cpe-cycle">CPE cycle</label>
              <select
                id="cpe-cycle"
                value={answers.cycleId}
                onChange={(e) => change({ cycleId: e.target.value })}
              >
                <option value="">Select a cycle</option>
                {cycles.map((c, i) => (
                  <option value={c.id} key={c.id}>
                    {i === 0 ? "Current" : "Upcoming"} · {formatDate(c.start)} —{" "}
                    {formatDate(c.end)}
                  </option>
                ))}
                {answers.cycleId && !cycle && (
                  <option value={answers.cycleId}>
                    Saved cycle — review required
                  </option>
                )}
              </select>
            </div>
            <p className="small muted">
              June–May dates are a configurable prototype assumption. Your
              annual licence year remains separate.
            </p>
            <fieldset className="radio-fieldset">
              <legend>
                In the current CPE cycle, have you enrolled with other CPE
                administrator(s)?
              </legend>
              <div className="radio-inline">
                {["yes", "no"].map((answer) => (
                  <label key={answer}>
                    <input
                      type="radio"
                      name="previous"
                      checked={answers.previousEnrolment === answer}
                      onChange={() =>
                        change({
                          previousEnrolment: answer as "yes" | "no",
                          ...(answer === "no" ? { effectiveDate: "" } : {}),
                        })
                      }
                    />
                    {answer === "yes" ? "Yes" : "No"}
                  </label>
                ))}
              </div>
            </fieldset>
            {answers.previousEnrolment === "yes" && (
              <label>
                Effective date of the new enrolment
                <input
                  type="date"
                  value={answers.effectiveDate}
                  min={cycle?.start}
                  max={cycle?.end}
                  onChange={(e) => change({ effectiveDate: e.target.value })}
                />
                <span className="input-note">
                  Demo default: within the selected cycle. Switching policy
                  awaits confirmation.
                </span>
              </label>
            )}
          </>
        )}
        {step === 1 && (
          <>
            <div className="form-section-heading">
              <span className="step-label">02</span>
              <div>
                <h2>Your administrator</h2>
                <p>
                  Each administrator has a separate, versioned question set.
                </p>
              </div>
            </div>
            <div>
              <label htmlFor="cpe-administrator">CPE administrator</label>
              <select
                id="cpe-administrator"
                value={answers.institutionId}
                onChange={(e) => {
                  if (
                    answers.category &&
                    !window.confirm(
                      "Changing the administrator removes its answers and signature. Continue?",
                    )
                  )
                    return;
                  change({ institutionId: e.target.value, category: "" });
                }}
              >
                <option value="">Select an administrator</option>
                {institutions.map((i) => (
                  <option
                    key={i.id}
                    value={i.id}
                    disabled={!i.enabled || !i.questionVersion}
                  >
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            {institution && (
              <fieldset className="radio-fieldset category-options">
                <legend>{institution.question}</legend>
                {institution.options.map((option) => (
                  <label key={option.id}>
                    <input
                      type="radio"
                      name="category"
                      checked={answers.category === option.id}
                      onChange={() => change({ category: option.id })}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
                <p className="small muted">
                  If none applies, save your draft. Eligibility wording needs
                  clarification with the institution.
                </p>
              </fieldset>
            )}
            <div className="alert info">
              Selecting an institution does not give it access to your passport
              or confirm a pairing.
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="form-section-heading">
              <span className="step-label">03</span>
              <div>
                <h2>Review and acknowledge</h2>
                <p>Check your answers and document versions before signing.</p>
              </div>
            </div>
            <dl className="review-grid">
              <dt>Applicant</dt>
              <dd>
                {data.profile.firstName} {data.profile.lastName}
              </dd>
              <dt>Contact email</dt>
              <dd>
                {data.user.email}{" "}
                {!data.user.emailVerified && (
                  <span className="badge amber">Verification required</span>
                )}
              </dd>
              <dt>Cycle</dt>
              <dd>
                {cycle
                  ? `${formatDate(cycle.start)} — ${formatDate(cycle.end)}`
                  : "Not selected"}
              </dd>
              <dt>Administrator</dt>
              <dd>{institution?.name || "Not selected"}</dd>
              <dt>Other current enrolment</dt>
              <dd>{answers.previousEnrolment || "Not answered"}</dd>
              {answers.previousEnrolment === "yes" && (
                <>
                  <dt>Effective date</dt>
                  <dd>{formatDate(answers.effectiveDate)}</dd>
                </>
              )}
              <dt>Category</dt>
              <dd>
                {institution?.options.find((o) => o.id === answers.category)
                  ?.label || "Not selected"}
              </dd>
              <dt>Documents</dt>
              <dd>
                {data.documents.length
                  ? data.documents
                      .filter((d) =>
                        d.type === "registration"
                          ? d.id ===
                            data.documents.find(
                              (x) => x.type === "registration",
                            )?.id
                          : d.id ===
                            data.documents.find(
                              (x) =>
                                x.type === "practising" &&
                                x.licence_year === Number(hkDate().slice(0, 4)),
                            )?.id,
                      )
                      .map((d) => (
                        <div key={d.id}>
                          {d.filename} · v{d.version}
                        </div>
                      ))
                  : "No documents uploaded"}
              </dd>
            </dl>
            <div className="statement-box">
              <span className="eyebrow">
                SAMPLE STATEMENT · {statement.version}
              </span>
              <h3>{statement.title}</h3>
              <p>{statement.text}</p>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>
                I have read and acknowledge this sample personal data collection
                statement.
              </span>
            </label>
            <Signature onChange={updateSignature} />
            {application.signed && reviewed ? (
              <div className="alert success">
                <CheckCircle2 size={20} />
                Your acknowledgement and signature are saved for this version.
              </div>
            ) : (
              <button
                className="secondary"
                disabled={busy || !acknowledged || !signature.value}
                onClick={() => void sign()}
              >
                Save acknowledgement and signature
                <Check size={16} />
              </button>
            )}
          </>
        )}
        <div className="form-actions">
          <div className="button-row">
            {step > 0 && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => void next(step - 1)}
              >
                <ArrowLeft size={15} />
                Back
              </button>
            )}
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                void task(async () => {
                  await save();
                }, "Your draft is saved.")
              }
            >
              <Save size={16} />
              Save draft
            </button>
          </div>
          {step < 2 ? (
            <button
              className="primary"
              disabled={busy}
              onClick={() => void next(step + 1)}
            >
              Continue
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="primary"
              disabled={
                busy ||
                !application.signed ||
                JSON.stringify(answers) !== JSON.stringify(application.data)
              }
              onClick={() => void submit()}
            >
              Submit in Scribo
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </section>
      <p className="wizard-footnote">
        Submission does not confirm CUHK receipt, acceptance, credential
        verification or an active pairing.
      </p>
    </>
  );
}
export function Receipt({ application }: { application: Application }) {
  const snapshot = application.snapshot!;
  const institution = snapshot.institution as (typeof institutions)[number];
  const cycle = snapshot.cycle as { label: string; start: string; end: string };
  return (
    <>
      <PageHeading
        eyebrow="APPLICATION RECEIPT"
        title="A record of your next step"
        description="Your submitted application is preserved and read-only."
      />
      <section className="panel receipt-panel">
        <div className="receipt-success">
          <span>
            <CheckCircle2 size={32} />
          </span>
          <h2>Submitted in Scribo</h2>
          <p>Administrator acceptance not confirmed</p>
          <code>{application.reference}</code>
        </div>
        <dl className="review-grid">
          <dt>Administrator</dt>
          <dd>{institution.name}</dd>
          <dt>CPE cycle</dt>
          <dd>
            {formatDate(cycle.start)} — {formatDate(cycle.end)}
          </dd>
          <dt>Submitted</dt>
          <dd>{formatDate(application.submitted_at, true)} HKT</dd>
          <dt>External delivery</dt>
          <dd>Not configured — no institutional transmission</dd>
          <dt>Pairing</dt>
          <dd>Not confirmed</dd>
          <dt>Certificate status</dt>
          <dd>Uploaded — not verified</dd>
        </dl>
        <div className="subsection">
          <h2>Submitted particulars</h2>
          <dl className="review-grid">
            {Object.entries(snapshot.profile).map(([key, value]) => (
              <div className="review-pair" key={key}>
                <dt>
                  {{
                    salutation: "Salutation",
                    firstName: "First name",
                    lastName: "Last name as shown in ID card",
                    chineseName: "Name in Chinese",
                    preferredName: "Preferred name",
                    phone: "Contact phone",
                    partialId: "First four ID / passport digits",
                    licenceNumber: "Registration number",
                    email: "Email",
                  }[key] || key}
                </dt>
                <dd>{value || "Not provided"}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="subsection">
          <h2>Answers and exact document versions</h2>
          <dl className="review-grid">
            <dt>Other enrolment in current cycle</dt>
            <dd>{snapshot.answers.previousEnrolment}</dd>
            {snapshot.answers.previousEnrolment === "yes" && (
              <>
                <dt>New enrolment effective date</dt>
                <dd>{formatDate(snapshot.answers.effectiveDate)}</dd>
              </>
            )}
            <dt>{institution.question}</dt>
            <dd>
              {
                institution.options.find(
                  (o) => o.id === snapshot.answers.category,
                )?.label
              }
            </dd>
          </dl>
          {snapshot.documents.map((doc) => (
            <div className="receipt-file" key={doc.id}>
              <FileText size={20} />
              <span>
                {doc.filename}
                <small>
                  Version {doc.version}
                  {doc.licence_year && ` · Licence year ${doc.licence_year}`}
                </small>
              </span>
              <a
                className="text-button"
                href={`/api/documents/${doc.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Preview
              </a>
            </div>
          ))}
        </div>
        <div className="subsection">
          <h2>Acknowledgement and signature</h2>
          <p className="muted">
            Sample statement {snapshot.statement.version} · Acknowledged{" "}
            {formatDate(snapshot.attestation.timestamp, true)} HKT
          </p>
          <p className="statement-box">{snapshot.statement.text}</p>
          <p className="small muted">
            Signature method: {snapshot.attestation.method}
          </p>
          {snapshot.attestation.method === "typed" ? (
            <p className="typed-signature">{snapshot.attestation.value}</p>
          ) : (
            <DrawnSignature value={snapshot.attestation.value} />
          )}
        </div>
      </section>
    </>
  );
}
