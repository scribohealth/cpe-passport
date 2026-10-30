import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { Bootstrap } from "../shared/model";
import { institutions, statement } from "../shared/config";
import { hkDate } from "../shared/config";
import { passportIssues, currentDocuments } from "../shared/validation";
import { AuthScreen } from "./AuthScreen";
import { PassportEditor, Documents } from "./Passport";
import { Enrolment, Receipt } from "./Enrolment";
import { json, request } from "./client";

type Config = {
  cycles: { id: string; label: string; start: string; end: string }[];
  institutions: typeof institutions;
  statement: typeof statement;
  googleEnabled: boolean;
  today: string;
};
export type Task = (
  work: () => Promise<void>,
  message?: string,
) => Promise<boolean>;
type Tab =
  | "dashboard"
  | "passport"
  | "documents"
  | "enrolment"
  | "history"
  | "notifications";
const nav = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "passport", label: "My particulars", icon: UserRound },
  { id: "documents", label: "Qualifications", icon: FileCheck2 },
  { id: "enrolment", label: "Enrolment", icon: FileText },
  { id: "history", label: "Applications", icon: History },
  { id: "notifications", label: "Notifications", icon: Bell },
] as const;
export function formatDate(date: string | null, time = false) {
  return date
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Hong_Kong",
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
      }).format(new Date(date.length === 10 ? `${date}T00:00:00+08:00` : date))
    : "Not recorded";
}

export function Portal({ resetPassword = false }: { resetPassword?: boolean }) {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setData(await request<Bootstrap>("/api/bootstrap"));
  }, []);
  useEffect(() => {
    void (async () => {
      try {
        const [cfg, response] = await Promise.all([
          request<Config>("/api/config"),
          fetch("/api/bootstrap"),
        ]);
        setConfig(cfg);
        if (response.ok) setData(await response.json());
        else if (response.status !== 401) {
          const body = (await response.json()) as { error: string };
          setError(body.error);
        }
        if (new URLSearchParams(location.search).has("error"))
          setError(
            "The authentication link could not be completed. Please sign in or request a new link.",
          );
      } catch {
        setError("Unable to connect. Check your connection and reload.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const task: Task = async (work, message) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      await refresh();
      if (message) setNotice(message);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const go = (target: Tab) => {
    setTab(target);
    setApplicationId(null);
    setNotice("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  if (loading)
    return (
      <main className="loading">
        <BookOpen size={36} />
        <p>Opening your passport…</p>
      </main>
    );
  if (!data || resetPassword)
    return (
      <>
        {error && (
          <div className="global-error" role="alert">
            {error}
          </div>
        )}
        <AuthScreen
          googleEnabled={config?.googleEnabled ?? false}
          resetPassword={resetPassword}
          onLogin={async () => {
            setError("");
            await refresh();
          }}
        />
      </>
    );
  const cfg = config!;
  const today = cfg?.today || hkDate();
  const issues = passportIssues(data.profile, data.documents, today);
  const docs = currentDocuments(data.documents, today);
  const application = data.applications.find((a) => a.id === applicationId);
  const initials =
    `${data.profile.firstName[0] || data.user.name[0] || ""}${data.profile.lastName[0] || ""}`.toUpperCase();
  async function newApplication() {
    await task(async () => {
      const result = await request<{ id: string }>(
        "/api/applications",
        json("POST", {}),
      );
      setApplicationId(result.id);
      setTab("enrolment");
    });
  }
  const drafts = data.applications.filter((a) => a.state === "draft");
  const submitted = data.applications.filter((a) => a.state === "submitted");
  const title = nav.find((n) => n.id === tab)!.label;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brand-mark">
            <BookOpen size={22} />
          </span>
          <span>
            scribo<span className="brand-sub">CPE PASSPORT</span>
          </span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Passport">
          {nav.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? "active" : ""}
              onClick={() => go(item.id)}
            >
              <item.icon size={19} />
              {item.label}
              {item.id === "notifications" &&
                data.notifications.some(
                  (n) => !n.read_at && n.channel === "in_app",
                ) && <span className="notification-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck size={20} />
            <p>
              Your passport is private.
              <br />
              <span>Only you can access your records.</span>
            </p>
          </div>
          <div className="sidebar-user">
            <span className="avatar">{initials}</span>
            <span>
              <strong>{data.profile.preferredName || data.user.name}</strong>
              <small>Pharmacist account</small>
            </span>
            <button
              aria-label="Sign out"
              title="Sign out"
              onClick={async () => {
                try {
                  await request("/api/auth/sign-out", json("POST", {}));
                  setData(null);
                } catch (err) {
                  setError((err as Error).message);
                }
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            My passport <ChevronRight size={14} />
            <strong>{title}</strong>
          </span>
          <div className="topbar-end">
            <span className="demo-tag">PRIVATE DEMO</span>
            <button
              className="icon-button"
              aria-label="Open notifications"
              onClick={() => go("notifications")}
            >
              <Bell size={19} />
            </button>
            <span className="avatar small-avatar">{initials}</span>
          </div>
        </header>
        <div className="demo-banner">
          <span className="demo-dot" />
          <span>
            Phase 1 demonstration. Use synthetic data only. Institutional
            delivery is disabled.
          </span>
        </div>
        <main id="main-content" className="main-content" aria-busy={busy}>
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button className="text-button" onClick={() => location.reload()}>
                Reload
              </button>
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              {notice}
            </div>
          )}
          {tab === "dashboard" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOUR PROFESSIONAL JOURNEY</span>
                  <h1>
                    Hello,{" "}
                    {data.profile.preferredName ||
                      data.profile.firstName ||
                      data.user.name}
                    .
                  </h1>
                  <p>
                    Your particulars, qualifications and next steps, all in one
                    place.
                  </p>
                </div>
                <span className="date-label">{formatDate(today)}</span>
              </div>
              <section className="overview-grid">
                <div className="passport-card">
                  <div className="passport-card-top">
                    <BookOpen size={27} strokeWidth={1.4} />
                    <span>PERSONAL PASSPORT</span>
                    <span className="card-chip">HONG KONG</span>
                  </div>
                  <h2>
                    {data.profile.firstName
                      ? `${data.profile.firstName} ${data.profile.lastName}`
                      : "Your professional passport"}
                  </h2>
                  <p>
                    {data.profile.licenceNumber
                      ? `Registration no. ${data.profile.licenceNumber}`
                      : "Add your particulars to make it yours."}
                  </p>
                  <div className="passport-card-footer">
                    <span>
                      <span className="status-light" />
                      {issues.length
                        ? "Passport in progress"
                        : "Passport complete · documents unverified"}
                    </span>
                    <button
                      onClick={() => go("passport")}
                      aria-label="Edit my particulars"
                    >
                      <ArrowRight size={21} />
                    </button>
                  </div>
                  <div className="passport-watermark" aria-hidden="true">
                    <BookOpen size={160} strokeWidth={0.5} />
                  </div>
                </div>
                <div className="panel cycle-panel">
                  <span className="eyebrow">CURRENT CPE CYCLE</span>
                  <h2>{cfg.cycles[0]?.label || "Not configured"}</h2>
                  <p>
                    {cfg.cycles[0]
                      ? `${formatDate(cfg.cycles[0].start)} — ${formatDate(cfg.cycles[0].end)}`
                      : "New cycle configuration is required."}
                  </p>
                  <div className="cycle-line" />
                  <div className="split-row">
                    <span className="muted">Administrator pairing</span>
                    <span className="badge neutral">Not confirmed</span>
                  </div>
                  <p className="small muted">
                    An application saved in Scribo does not confirm
                    institutional acceptance.
                  </p>
                </div>
              </section>
              <section className="dashboard-columns">
                <div>
                  <div className="section-heading">
                    <h2>Get your passport ready</h2>
                    <span className="muted small">
                      {
                        [
                          !!data.profile.firstName &&
                            !!data.profile.lastName &&
                            !!data.profile.salutation &&
                            /^\d{4}$/.test(data.profile.partialId) &&
                            !!data.profile.licenceNumber,
                          !!docs.registration,
                          !!docs.practising &&
                            !!docs.practising.valid_until &&
                            docs.practising.valid_until >= today,
                          data.user.emailVerified,
                        ].filter(Boolean).length
                      }{" "}
                      of 4 complete
                    </span>
                  </div>
                  <div className="panel checklist">
                    {[
                      {
                        done:
                          !!data.profile.firstName &&
                          !!data.profile.lastName &&
                          !!data.profile.salutation &&
                          /^\d{4}$/.test(data.profile.partialId) &&
                          !!data.profile.licenceNumber,
                        title: "Personal particulars",
                        desc: "Add your contact and registration information.",
                        target: "passport" as Tab,
                      },
                      {
                        done: !!docs.registration,
                        title: "Registration certificate",
                        desc: docs.registration
                          ? "Uploaded — not verified"
                          : "Upload a copy of your pharmacist registration.",
                        target: "documents" as Tab,
                      },
                      {
                        done:
                          !!docs.practising &&
                          !!docs.practising.valid_until &&
                          docs.practising.valid_until >= today,
                        title: `${today.slice(0, 4)} practising certificate`,
                        desc: !docs.practising
                          ? "Practising certificate missing. Add this year’s copy."
                          : docs.practising.valid_until &&
                              docs.practising.valid_until < today
                            ? "Update required — certificate expired."
                            : "Uploaded — not verified",
                        target: "documents" as Tab,
                      },
                      {
                        done: data.user.emailVerified,
                        title: "Verify your email",
                        desc: data.user.emailVerified
                          ? "Email ownership confirmed. Credentials remain unverified."
                          : "Required before final enrolment submission.",
                        target: "passport" as Tab,
                      },
                    ].map((item, index) => (
                      <button
                        className="checklist-row"
                        key={item.title}
                        onClick={() => go(item.target)}
                      >
                        <span
                          className={`checklist-number ${item.done ? "done" : ""}`}
                        >
                          {item.done ? <Check size={16} /> : `0${index + 1}`}
                        </span>
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.desc}</small>
                        </span>
                        <ChevronRight size={18} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="section-heading">
                    <h2>Your next step</h2>
                  </div>
                  <div className="panel next-step">
                    <span className="next-icon">
                      <FileText size={24} strokeWidth={1.5} />
                    </span>
                    <h3>Prepare your enrolment</h3>
                    <p>
                      Choose a cycle, answer your administrator’s questions and
                      keep a signed record.
                    </p>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() =>
                        drafts[0]
                          ? (setApplicationId(drafts[0].id),
                            setTab("enrolment"))
                          : void newApplication()
                      }
                    >
                      {drafts.length ? "Resume draft" : "Start an application"}
                      <ArrowRight size={16} />
                    </button>
                    <span className="small muted">
                      {issues.length
                        ? "You can save a draft while completing your passport."
                        : "Your passport is ready for the next step."}
                    </span>
                  </div>
                </div>
              </section>
              <div className="section-heading">
                <h2>Recent applications</h2>
                <button className="text-button" onClick={() => go("history")}>
                  View all <ArrowRight size={15} />
                </button>
              </div>
              <ApplicationList
                applications={data.applications.slice(0, 3)}
                onOpen={(id) => {
                  setApplicationId(id);
                  setTab("enrolment");
                }}
                onNew={() => void newApplication()}
              />
            </>
          )}
          {tab === "passport" && (
            <PassportEditor
              key={data.profileVersion}
              data={data}
              task={task}
              busy={busy}
            />
          )}
          {tab === "documents" && (
            <Documents data={data} task={task} busy={busy} today={today} />
          )}
          {tab === "enrolment" &&
            (application ? (
              application.state === "submitted" ? (
                <Receipt application={application} />
              ) : (
                <Enrolment
                  application={application}
                  data={data}
                  cycles={cfg.cycles}
                  task={task}
                  busy={busy}
                />
              )
            ) : (
              <>
                <PageHeading
                  eyebrow="CPE ADMINISTRATOR"
                  title="Enrolment"
                  description="Prepare an application at your own pace. Final submission records it in Scribo."
                />
                <div className="panel intro-panel">
                  <FileText size={32} />
                  <h2>A clear path to your next cycle</h2>
                  <p>
                    General information, administrator questions, then
                    acknowledgement and signature.
                  </p>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => void newApplication()}
                  >
                    New application
                    <Plus size={17} />
                  </button>
                </div>
                {drafts.length > 0 && (
                  <>
                    <div className="section-heading">
                      <h2>Continue a draft</h2>
                    </div>
                    <ApplicationList
                      applications={drafts}
                      onOpen={setApplicationId}
                      onNew={() => void newApplication()}
                    />
                  </>
                )}
              </>
            ))}
          {tab === "history" && (
            <>
              <PageHeading
                eyebrow="YOUR RECORDS"
                title="Applications"
                description={`${submitted.length} submitted · ${drafts.length} draft. Submitted records preserve the exact information you signed.`}
              />
              <div className="section-heading">
                <span />
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => void newApplication()}
                >
                  New application
                  <Plus size={16} />
                </button>
              </div>
              <ApplicationList
                applications={data.applications}
                onOpen={(id) => {
                  setApplicationId(id);
                  setTab("enrolment");
                }}
                onNew={() => void newApplication()}
              />
            </>
          )}
          {tab === "notifications" && (
            <>
              <PageHeading
                eyebrow="STAY UP TO DATE"
                title="Notifications"
                description="Practising-certificate renewal reminders, separate from CPE cycles."
              />
              {data.notifications.length ? (
                <div className="panel notifications">
                  {data.notifications.map((n) => (
                    <article key={n.id}>
                      <span className="next-icon">
                        <Bell size={18} />
                      </span>
                      <div>
                        <strong>{n.message}</strong>
                        <p className="small muted">
                          {formatDate(n.created_at, true)} HKT ·{" "}
                          {n.channel === "in_app" ? "In-app" : "Email"} ·{" "}
                          {n.status === "queued"
                            ? "Queued in demo outbox"
                            : n.status}
                        </p>
                      </div>
                      {!n.read_at && n.channel === "in_app" && (
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() =>
                            void task(async () => {
                              await request(
                                `/api/notifications/${n.id}/read`,
                                json("POST", {}),
                              );
                            })
                          }
                        >
                          Mark read
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="panel empty-state">
                  <Bell size={30} />
                  <h2>You’re all caught up</h2>
                  <p>
                    Renewal reminders will appear here. Demo defaults: 30 and 7
                    days before expiry, then once expired.
                  </p>
                </div>
              )}
            </>
          )}
          <footer className="workspace-footer">
            <span>© {new Date().getFullYear()} Scribo Limited</span>
            <span>Documents uploaded ≠ verified · Pairing not confirmed</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}
function ApplicationList({
  applications,
  onOpen,
  onNew,
}: {
  applications: Bootstrap["applications"];
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  if (!applications.length)
    return (
      <div className="panel empty-row">
        <span className="next-icon">
          <FileText size={23} />
        </span>
        <span>
          <strong>A fresh page</strong>
          <p>No applications yet. Your first one starts here.</p>
        </span>
        <button className="text-button" onClick={onNew}>
          Get started
          <ArrowRight size={16} />
        </button>
      </div>
    );
  return (
    <div className="panel application-list">
      {applications.map((app) => (
        <button key={app.id} onClick={() => onOpen(app.id)}>
          <span className="next-icon">
            {app.state === "submitted" ? (
              <CheckCircle2 size={20} />
            ) : (
              <FileText size={20} />
            )}
          </span>
          <span>
            <strong>
              {institutions.find((i) => i.id === app.data.institutionId)
                ?.name || "Enrolment application"}
            </strong>
            <small>
              {app.reference || "Saved draft"}
              {app.data.cycleId &&
                ` · ${app.data.cycleId.replace("cpe-", "")} cycle`}
            </small>
          </span>
          <span
            className={`badge ${app.state === "submitted" ? "green" : "neutral"}`}
          >
            {app.state === "submitted" ? "Submitted in Scribo" : "Draft"}
          </span>
          <ChevronRight size={17} />
        </button>
      ))}
    </div>
  );
}
