import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Miniflare } from "miniflare";
import { readFile } from "node:fs/promises";
import api, { detectFile } from "../src/server/api";
import { createAuth } from "../src/server/auth";
import { scheduleReminders } from "../src/server/reminders";
import { deliverMail } from "../src/server/mail";
import type { AppEnv } from "../src/server/env";
import { availableCycles, hkDate, institutions } from "../src/shared/config";
import {
  emptyProfile,
  type Application,
  type Bootstrap,
  type Profile,
} from "../src/shared/model";
import {
  draftSchema,
  passportIssues,
  signatureValid,
} from "../src/shared/validation";

let mf: Miniflare;
let env: AppEnv;
let alice: { cookie: string; id: string };
let bob: { cookie: string; id: string };
const origin = "http://localhost:5173";
const ctx = {
  waitUntil: (_promise: Promise<unknown>) => {},
  passThroughOnException: () => {},
  props: {},
} as ExecutionContext;
async function call(
  path: string,
  method = "GET",
  data?: unknown,
  cookie = alice?.cookie,
) {
  const form = data instanceof FormData;
  const headers: Record<string, string> = {
    Origin: origin,
    "cf-connecting-ip": "192.0.2.1",
    ...(form ? {} : { "Content-Type": "application/json" }),
  };
  if (cookie) headers.Cookie = cookie;
  return api.fetch(
    new Request(`${origin}${path}`, {
      method,
      headers,
      ...(data !== undefined
        ? { body: form ? data : JSON.stringify(data) }
        : {}),
    }),
    env,
    ctx,
  );
}
async function body<T>(response: Response): Promise<T> {
  const result = await response.json();
  expect(response.status, JSON.stringify(result)).toBeLessThan(400);
  return result as T;
}
async function bootstrap(cookie = alice.cookie) {
  return body<Bootstrap>(
    await call("/api/bootstrap", "GET", undefined, cookie),
  );
}
async function register(email: string) {
  const response = await call(
    "/api/auth/sign-up/email",
    "POST",
    {
      email,
      password: "Synthetic-test-password-2026!",
      name: "Synthetic Pharmacist",
    },
    "",
  );
  const result = await body<{ user: { id: string } }>(response);
  const cookies = response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return { cookie: cookies, id: result.user.id };
}
const profile: Profile = {
  ...emptyProfile,
  salutation: "Dr.",
  firstName: "Alex",
  lastName: "Test",
  partialId: "1234",
  licenceNumber: "TEST-001",
};
async function saveProfile(value = profile) {
  const data = await bootstrap();
  return call("/api/profile", "PUT", {
    profile: value,
    expectedVersion: data.profileVersion,
  });
}
function pdfFile() {
  return new File(
    ["%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n"],
    "synthetic-certificate.pdf",
    { type: "application/pdf" },
  );
}
async function upload(
  type: "registration" | "practising",
  year = Number(hkDate().slice(0, 4)),
  until = `${year}-12-31`,
  cookie = alice.cookie,
) {
  const form = new FormData();
  form.set("file", pdfFile());
  form.set("type", type);
  form.set("licenceYear", String(year));
  form.set("validUntil", until);
  return body<{ id: string }>(
    await call("/api/documents", "POST", form, cookie),
  );
}
async function draft(cycleId = availableCycles()[0].id) {
  const { id } = await body<{ id: string }>(
    await call("/api/applications", "POST", {}),
  );
  return body<Application>(
    await call(`/api/applications/${id}`, "PUT", {
      expectedVersion: 1,
      data: {
        cycleId,
        institutionId: "cuhk-sop",
        previousEnrolment: "no",
        effectiveDate: "stale",
        category: "sop-full-time",
      },
    }),
  );
}
async function sign(app: Application, method = "typed", value = "Alex Test") {
  return call(`/api/applications/${app.id}/sign`, "POST", {
    expectedVersion: app.version,
    acknowledged: true,
    method,
    value,
  });
}

beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("test") } }',
    compatibilityDate: "2026-07-01",
    d1Databases: { DB: "phase1-test" },
    r2Buckets: ["DOCUMENTS"],
  });
  env = {
    DB: (await mf.getD1Database("DB")) as unknown as D1Database,
    DOCUMENTS: (await mf.getR2Bucket("DOCUMENTS")) as unknown as R2Bucket,
    APP_URL: origin,
    BETTER_AUTH_SECRET: "synthetic-test-secret-for-local-tests-only-123456",
    EMAIL_MODE: "outbox",
    TEST_EMAIL_ALLOWLIST: "",
  };
  const sql = await readFile(
    new URL("../migrations/0001_phase1.sql", import.meta.url),
    "utf8",
  );
  // D1 exec treats lines as statements; keep multi-line trigger bodies intact.
  const triggers = sql.match(/CREATE TRIGGER[\s\S]*?END;/g) || [];
  const statements = [
    ...sql
      .replace(/CREATE TRIGGER[\s\S]*?END;/g, "")
      .split(";")
      .map((v) => v.trim())
      .filter(Boolean),
    ...triggers,
  ];
  await env.DB.batch(statements.map((statement) => env.DB.prepare(statement)));
  alice = await register("alice@example.test");
  bob = await register("bob@example.test");
});
afterAll(async () => {
  await mf?.dispose();
});

describe("configuration and server validation", () => {
  test("Hong Kong June–May boundary is separate from licence year", () => {
    expect(hkDate(new Date("2027-05-31T16:00:00Z"))).toBe("2027-06-01");
    expect(availableCycles(new Date("2027-05-31T15:59:59Z"))[0].id).toBe(
      "cpe-2026",
    );
    expect(availableCycles(new Date("2027-05-31T16:00:00Z"))[0].id).toBe(
      "cpe-2027",
    );
    expect(institutions[0].options).toHaveLength(5);
  });
  test("hidden fields and blank signatures are excluded", () => {
    expect(
      draftSchema.parse({
        cycleId: "",
        institutionId: "",
        category: "",
        previousEnrolment: "no",
        effectiveDate: "2026-01-01",
      }).effectiveDate,
    ).toBe("");
    expect(signatureValid("drawn", "[]")).toBe(false);
    expect(signatureValid("drawn", "[[[1,1],[1,1],[1,1]]]")).toBe(false);
    expect(signatureValid("drawn", "[[[1,1],[20,30],[70,40]]]")).toBe(true);
    expect(signatureValid("typed", "  ")).toBe(false);
  });
  test("rejects disguised and active PDFs", () => {
    expect(
      detectFile(new TextEncoder().encode("<script>alert(1)</script>")),
    ).toBeNull();
    expect(
      detectFile(new TextEncoder().encode("%PDF-1.4\n/JavaScript\n%%EOF")),
    ).toBeNull();
  });
});
describe("authentication and ownership", () => {
  test("registers distinct accounts and stores hashed passwords", async () => {
    expect(alice.id).not.toBe(bob.id);
    expect((await bootstrap()).user.emailVerified).toBe(false);
    const account = await env.DB.prepare(
      "SELECT password FROM account WHERE userId=?",
    )
      .bind(alice.id)
      .first<{ password: string }>();
    expect(account?.password).not.toContain("Synthetic-test-password");
    expect(account?.password.length).toBeGreaterThan(40);
  });
  test("requires a session and same-origin writes", async () => {
    expect((await call("/api/bootstrap", "GET", undefined, "")).status).toBe(
      401,
    );
    const response = await api.fetch(
      new Request(`${origin}/api/profile`, {
        method: "PUT",
        headers: { Origin: "https://attacker.invalid", Cookie: alice.cookie },
        body: "{}",
      }),
      env,
      ctx,
    );
    expect(response.status).toBe(403);
  });
  test("verification email outbox is private and real sending is disabled", async () => {
    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM email_outbox",
    ).first<{ n: number }>();
    expect(count!.n).toBe(2);
    expect((await call("/api/outbox")).status).toBe(404);
    await deliverMail(env);
    expect(
      (await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM email_outbox WHERE status='sent'",
      ).first<{ n: number }>())!.n,
    ).toBe(0);
  });
  test("verifies email using the queued single-use link", async () => {
    const email = await env.DB.prepare(
      "SELECT body FROM email_outbox WHERE owner_id=?",
    )
      .bind(alice.id)
      .first<{ body: string }>();
    const url = email!.body.match(/http:\/\/[^\s]+/)![0];
    const response = await createAuth(env).handler(new Request(url));
    expect(response.status).toBeLessThan(400);
    expect((await bootstrap()).user.emailVerified).toBe(true);
  });
});
describe("passport and private document versions", () => {
  test("saves partial information and rejects full IDs / stale versions", async () => {
    expect(
      (await saveProfile({ ...emptyProfile, firstName: "Partial" })).status,
    ).toBe(200);
    expect(
      (await saveProfile({ ...profile, partialId: "1234567" })).status,
    ).toBe(422);
    expect(
      (await call("/api/profile", "PUT", { profile, expectedVersion: 0 }))
        .status,
    ).toBe(409);
    expect((await saveProfile()).status).toBe(200);
    expect((await bootstrap(bob.cookie)).profile.firstName).toBe("");
  });
  test("requires both certificates and denies cross-owner access", async () => {
    expect(passportIssues(profile, [], hkDate()).length).toBeGreaterThan(0);
    const document = await upload("registration");
    expect((await call(`/api/documents/${document.id}`)).status).toBe(200);
    expect(
      (
        await call(
          `/api/documents/${document.id}`,
          "GET",
          undefined,
          bob.cookie,
        )
      ).status,
    ).toBe(404);
    expect(
      passportIssues(profile, (await bootstrap()).documents, hkDate()).join(),
    ).toContain("annual practising");
    await upload("practising");
    expect(
      passportIssues(profile, (await bootstrap()).documents, hkDate()),
    ).toEqual([]);
  });
  test("future-year upload does not satisfy a missing current year", async () => {
    await upload(
      "practising",
      Number(hkDate().slice(0, 4)) + 1,
      "2027-12-31",
      bob.cookie,
    );
    expect(
      passportIssues(
        profile,
        (await bootstrap(bob.cookie)).documents,
        hkDate(),
      ).join(),
    ).toContain("annual practising");
  });
});
describe("enrolment attestation, immutable snapshots and retries", () => {
  test("draft version conflicts, exact questions and incomplete signatures", async () => {
    const app = await draft();
    expect(
      (await call(`/api/applications/${app.id}`, "GET", undefined, bob.cookie))
        .status,
    ).toBe(404);
    expect(
      (
        await call(`/api/applications/${app.id}`, "PUT", {
          data: app.data,
          expectedVersion: 1,
        })
      ).status,
    ).toBe(409);
    expect((await sign(app, "drawn", "[]")).status).toBe(422);
    expect(
      (
        await call(`/api/applications/${app.id}/submit`, "POST", {
          expectedVersion: app.version,
        })
      ).status,
    ).toBe(422);
    const bad = await body<Application>(
      await call(`/api/applications/${app.id}`, "PUT", {
        data: { ...app.data, category: "none" },
        expectedVersion: app.version,
      }),
    );
    expect((await sign(bad)).status).toBe(422);
  });
  test("profile changes invalidate a draft signature", async () => {
    const app = await draft();
    const signed = await body<Application>(await sign(app));
    await saveProfile({ ...profile, preferredName: "Synthetic name" });
    expect(
      (
        await call(`/api/applications/${app.id}/submit`, "POST", {
          expectedVersion: signed.version,
        })
      ).status,
    ).toBe(422);
  });
  test("atomic repeat submission returns one receipt and keeps original evidence", async () => {
    const app = await draft();
    const signed = await body<Application>(await sign(app));
    const submissions = await Promise.all([
      call(`/api/applications/${app.id}/submit`, "POST", {
        expectedVersion: signed.version,
      }),
      call(`/api/applications/${app.id}/submit`, "POST", {
        expectedVersion: signed.version,
      }),
    ]);
    const receipts = await Promise.all(
      submissions.map((r) => body<Application>(r)),
    );
    expect(receipts[0].reference).toBe(receipts[1].reference);
    expect(receipts[0].snapshot!.pairing).toBe("Not confirmed");
    await saveProfile({ ...profile, firstName: "Changed later" });
    await upload("practising");
    const preserved = await body<Application>(
      await call(`/api/applications/${app.id}`),
    );
    expect(preserved.snapshot).toEqual(receipts[0].snapshot);
    const oldDocument = preserved.snapshot!.documents.find(
      (d) => d.type === "practising",
    )!;
    expect((await call(`/api/documents/${oldDocument.id}`)).status).toBe(200);
    expect(
      (
        await call(`/api/applications/${app.id}`, "PUT", {
          data: app.data,
          expectedVersion: preserved.version,
        })
      ).status,
    ).toBe(409);
    const duplicate = await draft();
    const duplicateSigned = await body<Application>(await sign(duplicate));
    expect(
      (
        await call(`/api/applications/${duplicate.id}/submit`, "POST", {
          expectedVersion: duplicateSigned.version,
        })
      ).status,
    ).toBe(409);
  });
  test("drawn signature can submit a separate upcoming-cycle application", async () => {
    const app = await draft(availableCycles()[1].id);
    const signed = await body<Application>(
      await sign(app, "drawn", "[[[1,1],[20,30],[70,40]]]"),
    );
    const receipt = await body<Application>(
      await call(`/api/applications/${app.id}/submit`, "POST", {
        expectedVersion: signed.version,
      }),
    );
    expect(receipt.snapshot!.attestation.method).toBe("drawn");
  });
});
describe("renewal reminder events", () => {
  test("scheduler retries deduplicate in-app and email independently", async () => {
    await upload("practising", 2026, "2026-12-31");
    await scheduleReminders(env, new Date("2026-12-01T01:00:00Z"));
    await scheduleReminders(env, new Date("2026-12-01T01:00:00Z"));
    const notifications = (await bootstrap()).notifications;
    expect(notifications.filter((n) => n.channel === "in_app")).toHaveLength(1);
    expect(notifications.filter((n) => n.channel === "email")).toHaveLength(1);
  });
  test("future-year certificates preserve current-year pending reminders; same-year replacements suppress them", async () => {
    await upload("practising", 2027, "2027-12-31");
    expect(
      (await bootstrap()).notifications.find((n) => n.channel === "email")!
        .status,
    ).toBe("queued");
    await upload("practising", 2026, "2026-12-31");
    expect(
      (await bootstrap()).notifications.find((n) => n.channel === "email")!
        .status,
    ).toBe("suppressed");
    await scheduleReminders(env, new Date("2026-12-24T01:00:00Z"));
    expect(
      (await bootstrap()).notifications.filter((n) => n.status === "queued"),
    ).toHaveLength(1);
  });
  test("expired previous-year certificate generates one event when the current year is missing", async () => {
    await scheduleReminders(env, new Date("2028-01-01T01:00:00Z"));
    await scheduleReminders(env, new Date("2028-01-01T01:00:00Z"));
    const events = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM notifications WHERE owner_id=? AND event_key LIKE '%expired:in_app'",
    )
      .bind(alice.id)
      .first<{ n: number }>();
    expect(events!.n).toBe(1);
  });
});
describe("account recovery and unresolved administrator configuration", () => {
  test("password reset is single use, revokes sessions and keeps the same account", async () => {
    const person = await register("recovery@example.test");
    expect(
      (
        await call(
          "/api/auth/request-password-reset",
          "POST",
          {
            email: "recovery@example.test",
            redirectTo: `${origin}/reset-password`,
          },
          person.cookie,
        )
      ).status,
    ).toBe(200);
    const email = await env.DB.prepare(
      "SELECT body FROM email_outbox WHERE owner_id=? AND event_key LIKE 'reset:%'",
    )
      .bind(person.id)
      .first<{ body: string }>();
    const link = email!.body.match(/http:\/\/[^\s]+/)![0];
    const redirect = await createAuth(env).handler(new Request(link));
    const token = new URL(redirect.headers.get("Location")!).searchParams.get(
      "token",
    );
    expect(token).toBeTruthy();
    const reset = { token, newPassword: "Another-synthetic-password-2026!" };
    expect(
      (await call("/api/auth/reset-password", "POST", reset, "")).status,
    ).toBe(200);
    expect(
      (await call("/api/auth/reset-password", "POST", reset, "")).status,
    ).toBeGreaterThanOrEqual(400);
    expect(
      (await call("/api/bootstrap", "GET", undefined, person.cookie)).status,
    ).toBe(401);
    const signin = await call(
      "/api/auth/sign-in/email",
      "POST",
      { email: "recovery@example.test", password: reset.newPassword },
      "",
    );
    const result = await body<{ user: { id: string } }>(signin);
    expect(result.user.id).toBe(person.id);
  });
  test("administrator without a confirmed question set cannot be signed", async () => {
    institutions.push({
      id: "pending-test",
      name: "Pending test administrator",
      enabled: true,
      questionVersion: "",
      question: "",
      options: [],
    });
    try {
      const app = await draft();
      const pending = await body<Application>(
        await call(`/api/applications/${app.id}`, "PUT", {
          data: {
            ...app.data,
            institutionId: "pending-test",
            category: "sop-full-time",
          },
          expectedVersion: app.version,
        }),
      );
      expect((await sign(pending)).status).toBe(422);
    } finally {
      institutions.pop();
    }
  });
  test("email change requires verification and preserves the current email until verified", async () => {
    expect(
      (
        await call("/api/auth/change-email", "POST", {
          newEmail: "new-alice@example.test",
          callbackURL: origin,
        })
      ).status,
    ).toBe(200);
    expect((await bootstrap()).user.email).toBe("alice@example.test");
    const email = await env.DB.prepare(
      "SELECT body FROM email_outbox WHERE owner_id=? AND recipient=?",
    )
      .bind(alice.id, "new-alice@example.test")
      .first<{ body: string }>();
    expect(email).toBeTruthy();
    const link = email!.body.match(/http:\/\/[^\s]+/)![0];
    const verified = await createAuth(env).handler(new Request(link));
    expect(verified.status).toBeLessThan(400);
    expect((await bootstrap()).user.email).toBe("new-alice@example.test");
    expect(
      (await bootstrap()).applications.find((a) => a.state === "submitted")!
        .snapshot!.profile.email,
    ).toBe("alice@example.test");
  });
  test("Google accounts never silently merge by email", () => {
    const auth = createAuth({
      ...env,
      GOOGLE_CLIENT_ID: "synthetic-google-client",
      GOOGLE_CLIENT_SECRET: "synthetic-google-secret",
    });
    expect(auth.options.account?.accountLinking?.enabled).toBe(false);
  });
});
