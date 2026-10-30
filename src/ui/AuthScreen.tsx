import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, BookOpen, Check, ShieldCheck } from "lucide-react";
import { json, request } from "./client";

export function AuthScreen({
  googleEnabled,
  onLogin,
  resetPassword = false,
}: {
  googleEnabled: boolean;
  onLogin: () => Promise<void>;
  resetPassword?: boolean;
}) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">(
    resetPassword ? "reset" : "login",
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "");
    const password = String(data.get("password") || "");
    try {
      if (mode === "forgot") {
        await request(
          "/api/auth/request-password-reset",
          json("POST", {
            email,
            redirectTo: `${location.origin}/reset-password`,
          }),
        );
        setNotice(
          "If this account exists, a single-use reset link has been queued. Demo delivery depends on the configured test email service.",
        );
      } else if (mode === "reset") {
        await request(
          "/api/auth/reset-password",
          json("POST", {
            newPassword: password,
            token: new URLSearchParams(location.search).get("token") || "",
          }),
        );
        history.replaceState({}, "", "/");
        setMode("login");
        setNotice("Password updated. Sign in with your new password.");
      } else {
        await request(
          `/api/auth/${mode === "register" ? "sign-up" : "sign-in"}/email`,
          json("POST", {
            email,
            password,
            ...(mode === "register"
              ? { name: String(data.get("name")), callbackURL: location.origin }
              : {}),
          }),
        );
        await onLogin();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <a className="brand light" href="/">
          <span className="brand-mark">
            <BookOpen size={22} />
          </span>
          <span>
            scribo<span className="brand-sub">CPE PASSPORT</span>
          </span>
        </a>
        <div className="auth-intro">
          <span className="eyebrow">FOR HONG KONG PHARMACISTS</span>
          <h1>
            Your credentials.
            <br />
            Your next chapter.
          </h1>
          <p>
            A personal home for your professional particulars, certificates and
            CPE enrolment.
          </p>
        </div>
        <div className="passport-art" aria-hidden="true">
          <div className="art-binding" />
          <BookOpen size={42} strokeWidth={1} />
          <span>PHARMACIST</span>
          <strong>
            Digital
            <br />
            Passport
          </strong>
          <div className="art-lines" />
          <small>SCRIBO · HONG KONG</small>
        </div>
        <p className="story-footer">
          <ShieldCheck size={17} /> Privately held. Always yours.
        </p>
      </section>
      <main className="auth-form-wrap">
        <div className="demo-tag">
          PRIVATE DEMONSTRATION <span>·</span> TEST DATA ONLY
        </div>
        <div className="auth-form">
          <span className="eyebrow">WELCOME TO YOUR PASSPORT</span>
          <h2>
            {mode === "register"
              ? "Start your passport"
              : mode === "forgot"
                ? "Reset your password"
                : mode === "reset"
                  ? "Choose a new password"
                  : "Welcome back"}
          </h2>
          <p className="muted">
            {mode === "register"
              ? "Create an account. Complete your particulars at your own pace."
              : mode === "login"
                ? "Sign in to pick up where you left off."
                : "Use a single-use, expiring link to recover your account."}
          </p>
          {error && (
            <div role="alert" className="alert error">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="alert success">
              {notice}
            </div>
          )}
          {(mode === "login" || mode === "register") && (
            <div className="segmented auth-tabs">
              <button
                aria-pressed={mode === "login"}
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                Sign in
              </button>
              <button
                aria-pressed={mode === "register"}
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
              >
                Create account
              </button>
            </div>
          )}
          <form onSubmit={submit}>
            {mode === "register" && (
              <label>
                Your name
                <input
                  name="name"
                  required
                  maxLength={120}
                  autoComplete="name"
                  placeholder="Your name"
                />
              </label>
            )}
            {mode !== "reset" && (
              <label>
                Email address
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label>
                Password
                <input
                  type="password"
                  name="password"
                  required
                  minLength={mode === "login" ? undefined : 12}
                  maxLength={128}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder={
                    mode === "login"
                      ? "Enter your password"
                      : "At least 12 characters"
                  }
                />
              </label>
            )}
            {mode === "login" && (
              <button
                type="button"
                className="text-button forgot"
                onClick={() => setMode("forgot")}
              >
                Forgot password?
              </button>
            )}
            <button className="primary full" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "register"
                  ? "Create my passport"
                  : mode === "forgot"
                    ? "Send reset link"
                    : mode === "reset"
                      ? "Update password"
                      : "Sign in"}
              <ArrowRight size={17} />
            </button>
          </form>
          {mode === "login" || mode === "register" ? (
            <>
              <div className="divider">
                <span>or continue with</span>
              </div>
              <button
                className="secondary full"
                disabled={busy || !googleEnabled}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const result = await request<{ url: string }>(
                      "/api/auth/sign-in/social",
                      json("POST", {
                        provider: "google",
                        callbackURL: location.origin,
                      }),
                    );
                    location.assign(result.url);
                  } catch (err) {
                    setError((err as Error).message);
                    setBusy(false);
                  }
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285f4"
                    d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"
                  />
                  <path
                    fill="#34a853"
                    d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0 0 12 22Z"
                  />
                  <path
                    fill="#fbbc05"
                    d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9l3.4-2.6Z"
                  />
                  <path
                    fill="#ea4335"
                    d="M12 6c1.5 0 2.9.5 3.9 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.5l3.4 2.6A6 6 0 0 1 12 6Z"
                  />
                </svg>
                Google
              </button>
              {!googleEnabled && (
                <p className="small muted">
                  Google sign-in will be available after OAuth credentials are
                  configured.
                </p>
              )}
            </>
          ) : (
            <button className="text-button" onClick={() => setMode("login")}>
              Back to sign in
            </button>
          )}
          <p className="auth-note">
            <Check size={15} /> Account access does not verify professional
            eligibility.
          </p>
          <p className="small muted">
            Operated by Scribo Limited. This private prototype uses synthetic
            particulars and sample documents. No institutional submission is
            enabled.
          </p>
        </div>
      </main>
    </div>
  );
}
