import { useState } from "react";
import type { FormEvent } from "react";
import { Check, Download, Eye, FileText, Upload } from "lucide-react";
import { salutations } from "../shared/config";
import type { Bootstrap, Profile } from "../shared/model";
import { PageHeading, formatDate } from "./Portal";
import type { Task } from "./Portal";
import { json, request } from "./client";

export function PassportEditor({
  data,
  task,
  busy,
}: {
  data: Bootstrap;
  task: Task;
  busy: boolean;
}) {
  const [profile, setProfile] = useState(data.profile);
  const [newEmail, setNewEmail] = useState("");
  function field(
    key: keyof Profile,
    label: string,
    optional = false,
    extra: Record<string, unknown> = {},
  ) {
    return (
      <label>
        {label}
        {optional && <span className="optional">Optional</span>}
        <input
          value={profile[key]}
          maxLength={
            key === "phone"
              ? 40
              : key === "partialId"
                ? 4
                : key === "licenceNumber"
                  ? 80
                  : 120
          }
          onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
          {...extra}
        />
      </label>
    );
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    await task(async () => {
      await request(
        "/api/profile",
        json("PUT", { profile, expectedVersion: data.profileVersion }),
      );
    }, "Your particulars are saved. Draft attestations need a fresh signature after changes.");
  }
  return (
    <>
      <PageHeading
        eyebrow="PERSONAL PASSPORT"
        title="My particulars"
        description="Save what you have now and return whenever you’re ready."
      />
      <form className="panel form-panel" onSubmit={save}>
        <div className="form-section-heading">
          <span className="step-label">01</span>
          <div>
            <h2>Personal particulars</h2>
            <p>Use your legal name as shown in your identification document.</p>
          </div>
        </div>
        <div className="form-grid">
          <div>
            <label htmlFor="profile-salutation">Salutation</label>
            <select
              id="profile-salutation"
              value={profile.salutation}
              onChange={(e) =>
                setProfile({ ...profile, salutation: e.target.value })
              }
            >
              <option value="">Select salutation</option>
              {salutations.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div />
          {field("firstName", "First name", false, {
            autoComplete: "given-name",
          })}
          {field("lastName", "Last name as shown in ID card", false, {
            autoComplete: "family-name",
          })}
          {field("chineseName", "Name in Chinese", true)}
          {field("preferredName", "Preferred name", true)}
          {field("phone", "Contact phone number", true, {
            type: "tel",
            autoComplete: "tel",
            placeholder: "+852",
          })}
          <label>
            Contact email
            <input type="email" value={data.user.email} readOnly />
            <span
              className={`input-note ${data.user.emailVerified ? "verified" : ""}`}
            >
              {data.user.emailVerified
                ? "Email ownership verified"
                : "Email verification pending"}
            </span>
          </label>
          {field(
            "partialId",
            "First four digits of ID card or passport number",
            false,
            {
              inputMode: "numeric",
              pattern: "[0-9]{0,4}",
              placeholder: "1234",
            },
          )}
          <p className="field-help">
            Only four digits. Do not enter your full identification number.
          </p>
        </div>
        <div className="form-section-heading subsection">
          <span className="step-label">02</span>
          <div>
            <h2>Professional registration</h2>
            <p>Document receipt and professional verification are separate.</p>
          </div>
        </div>
        <div className="form-grid">
          {field("licenceNumber", "Pharmacist licence registration number")}
        </div>
        <div className="form-actions">
          <span className="muted small">Partial information can be saved.</span>
          <button className="primary" disabled={busy}>
            Save particulars
            <Check size={16} />
          </button>
        </div>
      </form>
      <section className="panel form-panel email-settings">
        <h2>Account email</h2>
        <p className="muted">
          Your contact email follows your verified account email. Submitted
          snapshots retain their original address.
        </p>
        {!data.user.emailVerified && (
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              void task(async () => {
                await request(
                  "/api/auth/send-verification-email",
                  json("POST", {
                    email: data.user.email,
                    callbackURL: location.origin,
                  }),
                );
              }, "A verification link is queued for the configured demo email service.")
            }
          >
            Resend verification link
          </button>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void task(async () => {
              await request(
                "/api/auth/change-email",
                json("POST", { newEmail, callbackURL: location.origin }),
              );
            }, "Check the verification link for your new email before using it.");
          }}
        >
          <label>
            New email address
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <button className="secondary" disabled={busy}>
            Request email change
          </button>
        </form>
      </section>
    </>
  );
}
export function Documents({
  data,
  task,
  busy,
  today,
}: {
  data: Bootstrap;
  task: Task;
  busy: boolean;
  today: string;
}) {
  const [type, setType] = useState<"registration" | "practising">(
    "registration",
  );
  const [year, setYear] = useState(today.slice(0, 4));
  const [until, setUntil] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    form.set("type", type);
    if (type === "practising") {
      form.set("licenceYear", year);
      form.set("validUntil", until);
    }
    setUploading(true);
    const ok = await task(async () => {
      await request("/api/documents", { method: "POST", body: form });
    }, "Certificate uploaded — not verified. Previous versions are preserved.");
    if (ok) {
      setFile(null);
      setInputKey((k) => k + 1);
    }
    setUploading(false);
  }
  return (
    <>
      <PageHeading
        eyebrow="QUALIFICATIONS"
        title="Your documents"
        description="A private record of your registration and annual practising certificates."
      />
      <div className="alert info">
        <FileText size={19} />
        <span>
          Uploaded documents are not professionally verified. A future-year
          certificate does not replace the current-year requirement.
        </span>
      </div>
      <form className="panel form-panel" onSubmit={upload}>
        <h2>Upload a certificate</h2>
        <div className="form-grid">
          <div>
            <label htmlFor="document-type">Document type</label>
            <select
              id="document-type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
            >
              <option value="registration">
                Pharmacist registration certificate
              </option>
              <option value="practising">Annual practising certificate</option>
            </select>
          </div>
          {type === "practising" && (
            <>
              <label>
                Licence year
                <input
                  type="number"
                  required
                  min={2000}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </label>
              <label>
                Validity-end date
                <input
                  type="date"
                  required
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                />
              </label>
              <p className="field-help">
                The licence year is separate from your June–May CPE cycle. This
                date supports the demo renewal reminders.
              </p>
            </>
          )}
        </div>
        <label className="upload-zone">
          <Upload size={27} />
          <strong>{file ? file.name : "Choose your certificate"}</strong>
          <span>PDF, JPEG or PNG · maximum 10 MiB</span>
          <input
            key={inputKey}
            type="file"
            required
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        {uploading && <p role="status">Uploading securely…</p>}
        <div className="form-actions">
          <span className="small muted">
            Synthetic documents only for this demonstration.
          </span>
          <button className="primary" disabled={busy || !file}>
            {uploading ? "Uploading…" : "Upload certificate"}
            <Upload size={16} />
          </button>
        </div>
      </form>
      <div className="section-heading">
        <h2>Document versions</h2>
        <span className="small muted">{data.documents.length} files</span>
      </div>
      {data.documents.length ? (
        <div className="panel document-list">
          {data.documents.map((doc) => (
            <article key={doc.id}>
              <span className="file-icon">
                <FileText size={25} strokeWidth={1.5} />
              </span>
              <div className="document-detail">
                <strong>
                  {doc.type === "registration"
                    ? "Registration certificate"
                    : `${doc.licence_year} practising certificate`}
                </strong>
                <p>
                  {doc.filename} <span>· Version {doc.version}</span>
                </p>
                <small>
                  Uploaded {formatDate(doc.uploaded_at)}
                  {doc.valid_until &&
                    ` · Valid until ${formatDate(doc.valid_until)}`}
                </small>
              </div>
              <span className="badge amber">Uploaded — not verified</span>
              <div className="document-actions">
                <a
                  href={`/api/documents/${doc.id}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Preview ${doc.filename}`}
                  title="Preview"
                >
                  <Eye size={18} />
                </a>
                <a
                  href={`/api/documents/${doc.id}?download=1`}
                  aria-label={`Download ${doc.filename}`}
                  title="Download"
                >
                  <Download size={18} />
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel empty-state">
          <FileText size={30} />
          <h2>Your certificates belong here</h2>
          <p>
            Upload your registration certificate and this year’s annual
            practising certificate to complete your passport.
          </p>
        </div>
      )}
    </>
  );
}
