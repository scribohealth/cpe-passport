import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { bodyLimit } from "hono/body-limit";
import { z, ZodError } from "zod";
import { createAuth } from "./auth";
import type { AppEnv } from "./env";
import {
  availableCycles,
  cycles,
  hkDate,
  institutions,
  statement,
} from "../shared/config";
import { emptyDraft } from "../shared/model";
import {
  currentDocuments,
  draftSchema,
  enrolmentIssues,
  passportIssues,
  profileSchema,
  signatureValid,
  validDate,
} from "../shared/validation";
import {
  applicationView,
  ownApplication,
  ownDocuments,
  ownProfile,
  signingContext,
} from "./repository";
import { deliverMail } from "./mail";
import { reportFailure } from "./diagnostics";

type AuthUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
};
const fail = (
  status: 400 | 401 | 403 | 404 | 409 | 422,
  message: string,
): never => {
  throw new HTTPException(status, { message });
};
const versionSchema = z.number().int().nonnegative();
const api = new Hono<{
  Bindings: AppEnv;
  Variables: { user: AuthUser; requestId: string };
}>();
api.use("*", async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set("requestId", requestId);
  c.header("X-Request-ID", requestId);
  c.header("Cache-Control", "no-store, private");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  await next();
});
api.onError((err, c) => {
  if (err instanceof HTTPException)
    return c.json({ error: err.message }, err.status);
  if (err instanceof ZodError)
    return c.json(
      {
        error: err.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(" "),
      },
      422,
    );
  if (err instanceof SyntaxError)
    return c.json({ error: "Invalid request data." }, 400);
  const requestId = c.get("requestId");
  reportFailure(err, requestId);
  return c.json(
    {
      error: `The request could not be completed. Please try again. Reference: ${requestId}`,
      requestId,
    },
    500,
  );
});
api.get("/api/config", (c) =>
  c.json({
    cycles: availableCycles(),
    institutions,
    statement,
    googleEnabled: !!(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET),
    today: hkDate(),
  }),
);
api.on(["GET", "POST"], "/api/auth/*", async (c) => {
  const response = await createAuth(c.env, c.get("requestId")).handler(
    c.req.raw,
  );
  if (response.status >= 500) {
    const requestId = c.get("requestId");
    reportFailure(new Error("Authentication request failed"), requestId);
    return c.json(
      {
        error: `Sign-in could not be completed. Reference: ${requestId}`,
        requestId,
      },
      500,
    );
  }
  c.executionCtx.waitUntil(deliverMail(c.env));
  return response;
});
api.use("/api/*", async (c, next) => {
  if (
    !["GET", "HEAD"].includes(c.req.method) &&
    c.req.header("Origin") !== new URL(c.env.APP_URL).origin
  )
    fail(403, "A same-origin request is required.");
  const session = await createAuth(c.env, c.get("requestId")).api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) fail(401, "Please sign in to your passport.");
  c.set("user", session!.user);
  await next();
});
api.use(
  "/api/*",
  bodyLimit({
    maxSize: 11 * 1024 * 1024,
    onError: (c) => c.json({ error: "The upload is too large." }, 413),
  }),
);
api.get("/api/bootstrap", async (c) => {
  const owner = c.get("user").id;
  const [profile, documents, apps, notifications] = await Promise.all([
    ownProfile(c.env, owner),
    ownDocuments(c.env, owner),
    c.env.DB.prepare(
      "SELECT * FROM applications WHERE owner_id=? ORDER BY created_at DESC",
    )
      .bind(owner)
      .all<import("./repository").ApplicationRow>(),
    c.env.DB.prepare(
      "SELECT id,message,channel,status,created_at,read_at FROM notifications WHERE owner_id=? ORDER BY created_at DESC LIMIT 100",
    )
      .bind(owner)
      .all(),
  ]);
  return c.json({
    user: c.get("user"),
    profile: profile.profile,
    profileVersion: profile.version,
    documents,
    applications: apps.results.map(applicationView),
    notifications: notifications.results,
  });
});
api.put("/api/profile", async (c) => {
  const input = z
    .object({ profile: profileSchema, expectedVersion: versionSchema })
    .strict()
    .parse(await c.req.json());
  const owner = c.get("user").id;
  const current = await ownProfile(c.env, owner);
  if (current.version !== input.expectedVersion)
    fail(409, "Your passport changed in another tab. Reload before saving.");
  const sql =
    input.expectedVersion === 0
      ? c.env.DB.prepare(
          "INSERT OR IGNORE INTO profiles (owner_id,data,version,updated_at) VALUES (?,?,1,?)",
        ).bind(owner, JSON.stringify(input.profile), new Date().toISOString())
      : c.env.DB.prepare(
          "UPDATE profiles SET data=?,version=version+1,updated_at=? WHERE owner_id=? AND version=?",
        ).bind(
          JSON.stringify(input.profile),
          new Date().toISOString(),
          owner,
          input.expectedVersion,
        );
  const result = await sql.run();
  if (!result.meta.changes)
    fail(409, "Your passport changed. Reload before saving.");
  return c.json({ version: input.expectedVersion + 1 });
});
api.post("/api/documents", async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");
  const type = z.enum(["registration", "practising"]).parse(form.get("type"));
  if (!(file instanceof File)) fail(422, "Choose a certificate file.");
  const upload = file as File;
  const max = Math.min(
    Number(c.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024,
    10 * 1024 * 1024,
  );
  if (!upload.size || upload.size > max)
    fail(
      422,
      `The file must be between 1 byte and ${Math.floor(max / 1024 / 1024)} MiB.`,
    );
  const bytes = new Uint8Array(await upload.arrayBuffer());
  const mime = detectFile(bytes);
  if (!mime || mime !== upload.type)
    fail(
      422,
      "Use a genuine PDF, JPEG or PNG. Active PDF content is not allowed.",
    );
  const year = type === "practising" ? Number(form.get("licenceYear")) : null;
  const validUntil =
    type === "practising" ? String(form.get("validUntil") || "") : null;
  if (
    type === "practising" &&
    (!year ||
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100 ||
      !validUntil ||
      !validDate(validUntil))
  )
    fail(422, "Enter a valid licence year and validity-end date.");
  const owner = c.get("user").id;
  const id = crypto.randomUUID();
  const key = `${owner}/${id}`;
  const filename =
    upload.name.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(0, 160) ||
    "certificate";
  await c.env.DOCUMENTS.put(key, bytes, {
    httpMetadata: { contentType: mime! },
  });
  try {
    await c.env.DB.prepare(
      `INSERT INTO documents (id,owner_id,type,object_key,filename,mime,size,licence_year,valid_until,version,uploaded_at)
      SELECT ?,?,?,?,?,?,?,?,?,COALESCE(MAX(version),0)+1,? FROM documents WHERE owner_id=? AND type=?`,
    )
      .bind(
        id,
        owner,
        type,
        key,
        filename,
        mime,
        upload.size,
        year,
        validUntil,
        new Date().toISOString(),
        owner,
        type,
      )
      .run();
  } catch (err) {
    await c.env.DOCUMENTS.delete(key);
    throw err;
  }
  return c.json({ id }, 201);
});
api.get("/api/documents/:id", async (c) => {
  const doc = await c.env.DB.prepare(
    "SELECT object_key,mime,filename,version FROM documents WHERE id=? AND owner_id=?",
  )
    .bind(c.req.param("id"), c.get("user").id)
    .first<{
      object_key: string;
      mime: string;
      filename: string;
      version: number;
    }>();
  if (!doc) fail(404, "Document not found.");
  const object = await c.env.DOCUMENTS.get(doc!.object_key);
  if (!object) fail(404, "Document not found.");
  await c.env.DB.prepare("INSERT INTO audit_events VALUES (?,?,?,?,?,?)")
    .bind(
      crypto.randomUUID(),
      c.get("user").id,
      "document.read",
      c.req.param("id"),
      doc!.version,
      new Date().toISOString(),
    )
    .run();
  return new Response(object!.body, {
    headers: {
      "Content-Type": doc!.mime,
      "Content-Length": String(object!.size),
      "Content-Disposition": `${c.req.query("download") === "1" ? "attachment" : "inline"}; filename="certificate"; filename*=UTF-8''${encodeURIComponent(doc!.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "Referrer-Policy": "no-referrer",
    },
  });
});
api.post("/api/applications", async (c) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    "INSERT INTO applications (id,owner_id,data,created_at,updated_at) VALUES (?,?,?,?,?)",
  )
    .bind(id, c.get("user").id, JSON.stringify(emptyDraft), now, now)
    .run();
  return c.json({ id }, 201);
});
api.get("/api/applications/:id", async (c) => {
  const row = await ownApplication(c.env, c.get("user").id, c.req.param("id"));
  if (!row) fail(404, "Application not found.");
  return c.json(applicationView(row!));
});
api.put("/api/applications/:id", async (c) => {
  const input = z
    .object({ data: draftSchema, expectedVersion: versionSchema })
    .strict()
    .parse(await c.req.json());
  const owner = c.get("user").id;
  const row = await ownApplication(c.env, owner, c.req.param("id"));
  if (!row) fail(404, "Application not found.");
  if (row!.state !== "draft")
    fail(409, "Submitted applications are read-only.");
  if (
    JSON.stringify(input.data) === row!.data &&
    input.expectedVersion === row!.version
  )
    return c.json(applicationView(row!));
  const result = await c.env.DB.prepare(
    "UPDATE applications SET data=?,cycle_id=?,institution_id=?,version=version+1,attestation=NULL,attested_context=NULL,updated_at=? WHERE id=? AND owner_id=? AND version=? AND state='draft'",
  )
    .bind(
      JSON.stringify(input.data),
      input.data.cycleId,
      input.data.institutionId,
      new Date().toISOString(),
      row!.id,
      owner,
      input.expectedVersion,
    )
    .run();
  if (!result.meta.changes)
    fail(409, "The draft changed in another tab. Reload before saving.");
  return c.json(
    applicationView((await ownApplication(c.env, owner, row!.id))!),
  );
});
api.post("/api/applications/:id/sign", async (c) => {
  const input = z
    .object({
      expectedVersion: versionSchema,
      acknowledged: z.literal(true),
      method: z.enum(["typed", "drawn"]),
      value: z.string().max(100000),
    })
    .strict()
    .parse(await c.req.json());
  const user = c.get("user");
  const row = await ownApplication(c.env, user.id, c.req.param("id"));
  if (!row) fail(404, "Application not found.");
  if (row!.state !== "draft")
    fail(409, "Submitted applications are read-only.");
  if (!signatureValid(input.method, input.value))
    fail(422, "Enter your full name or draw a non-blank signature.");
  const context = await signingContext(c.env, user.id, row!, user.email);
  const issues = [
    ...passportIssues(context.profile, context.documents, hkDate()),
    ...enrolmentIssues(JSON.parse(row!.data)),
  ];
  if (!user.emailVerified)
    issues.push("Verify your contact email before signing and submission.");
  if (issues.length) fail(422, issues.join(" "));
  const attestation = {
    method: input.method,
    value: input.value,
    acknowledged: true,
    timestamp: new Date().toISOString(),
  };
  const result = await c.env.DB.prepare(
    "UPDATE applications SET attestation=?,attested_context=?,version=version+1,updated_at=? WHERE id=? AND owner_id=? AND version=? AND state='draft'",
  )
    .bind(
      JSON.stringify(attestation),
      context.hash,
      attestation.timestamp,
      row!.id,
      user.id,
      input.expectedVersion,
    )
    .run();
  if (!result.meta.changes)
    fail(409, "The draft changed. Review it and sign again.");
  return c.json(
    applicationView((await ownApplication(c.env, user.id, row!.id))!),
  );
});
api.post("/api/applications/:id/submit", async (c) => {
  const input = z
    .object({ expectedVersion: versionSchema })
    .strict()
    .parse(await c.req.json());
  const user = c.get("user");
  const row = await ownApplication(c.env, user.id, c.req.param("id"));
  if (!row) fail(404, "Application not found.");
  // Draft identity is the idempotency key. Successful retries return the same receipt.
  if (row!.state === "submitted") return c.json(applicationView(row!));
  if (!user.emailVerified) fail(422, "Verify your email before submission.");
  const context = await signingContext(c.env, user.id, row!, user.email);
  const data = draftSchema.parse(JSON.parse(row!.data));
  const issues = [
    ...passportIssues(context.profile, context.documents, hkDate()),
    ...enrolmentIssues(data),
  ];
  if (!availableCycles().some((cycle) => cycle.id === data.cycleId))
    issues.push(
      "This draft is outside the configured current/upcoming cycles. Review the cycle before continuing.",
    );
  if (!row!.attestation || row!.attested_context !== context.hash)
    issues.push(
      "The passport, documents or application changed. Acknowledge and sign again.",
    );
  if (issues.length) fail(422, issues.join(" "));
  const docs = currentDocuments(context.documents, hkDate());
  const snapshot = {
    profile: { ...context.profile, email: user.email },
    profileVersion: context.version,
    documents: [docs.registration, docs.practising],
    answers: data,
    institution: institutions.find((i) => i.id === data.institutionId),
    cycle: cycles.find((cycle) => cycle.id === data.cycleId),
    statement,
    attestation: JSON.parse(row!.attestation!),
    pairing: "Not confirmed",
  };
  const now = new Date().toISOString();
  const reference = `SCP-${new Date().getUTCFullYear()}-${row!.id.toUpperCase()}`;
  try {
    const result = await c.env.DB.prepare(
      `UPDATE applications SET state='submitted',snapshot=?,reference=?,submitted_at=?,updated_at=?,version=version+1
      WHERE id=? AND owner_id=? AND version=? AND state='draft'
      AND (SELECT version FROM profiles WHERE owner_id=?)=?
      AND (SELECT COUNT(*) FROM documents WHERE owner_id=?)=?
      AND EXISTS (SELECT 1 FROM user WHERE id=? AND email=? AND emailVerified=1)`,
    )
      .bind(
        JSON.stringify(snapshot),
        reference,
        now,
        now,
        row!.id,
        user.id,
        input.expectedVersion,
        user.id,
        context.version,
        user.id,
        context.documents.length,
        user.id,
        user.email,
      )
      .run();
    if (!result.meta.changes) {
      const latest = await ownApplication(c.env, user.id, row!.id);
      if (latest?.state === "submitted") return c.json(applicationView(latest));
      fail(409, "Your draft or passport changed. Review and sign again.");
    }
  } catch (err) {
    if (err instanceof HTTPException) throw err;
    const existing = await c.env.DB.prepare(
      "SELECT reference FROM applications WHERE owner_id=? AND cycle_id=? AND institution_id=? AND state='submitted'",
    )
      .bind(user.id, data.cycleId, data.institutionId)
      .first<{ reference: string }>();
    if (existing)
      fail(
        409,
        `An application already exists. Retain your existing reference: ${existing.reference}`,
      );
    throw err;
  }
  return c.json(
    applicationView((await ownApplication(c.env, user.id, row!.id))!),
  );
});
api.post("/api/notifications/:id/read", async (c) => {
  const result = await c.env.DB.prepare(
    "UPDATE notifications SET read_at=? WHERE id=? AND owner_id=?",
  )
    .bind(new Date().toISOString(), c.req.param("id"), c.get("user").id)
    .run();
  if (!result.meta.changes) fail(404, "Notification not found.");
  return c.json({ ok: true });
});
api.all("/api/*", (c) => c.json({ error: "Not found." }, 404));

export function detectFile(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
  )
    return "image/png";
  if (
    bytes.length >= 4 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255 &&
    bytes.at(-2) === 255 &&
    bytes.at(-1) === 217
  )
    return "image/jpeg";
  const text = new TextDecoder("latin1").decode(bytes);
  const pdfNames = text.replace(/#([0-9a-f]{2})/gi, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
  if (
    text.startsWith("%PDF-") &&
    /%%EOF\s*$/.test(text) &&
    !/\/(?:JavaScript|JS|OpenAction|AA|Launch|EmbeddedFile|RichMedia|Encrypt|ObjStm|XFA|SubmitForm)\b/i.test(
      pdfNames,
    )
  )
    return "application/pdf";
  return null;
}
export default api;
