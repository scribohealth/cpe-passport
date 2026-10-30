import type { AppEnv } from "./env";

export async function enqueueMail(
  env: AppEnv,
  owner: string,
  event: string,
  recipient: string,
  subject: string,
  body: string,
) {
  await env.DB.prepare(
    "INSERT OR IGNORE INTO email_outbox (id,owner_id,event_key,recipient,subject,body,created_at) VALUES (?,?,?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      owner,
      event,
      recipient,
      subject,
      body,
      new Date().toISOString(),
    )
    .run();
}

// The outbox is deliberately not available through any pharmacist API.
export async function deliverMail(env: AppEnv) {
  if (env.EMAIL_MODE !== "cloudflare") return;
  if (!env.SEND_EMAIL || !env.EMAIL_FROM)
    throw new Error("Cloudflare email binding and sender are required");
  const allowed = new Set(
    env.TEST_EMAIL_ALLOWLIST.split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
  );
  const now = new Date().toISOString();
  const { results } = await env.DB.prepare(
    "SELECT * FROM email_outbox WHERE status IN ('pending','failed','sending') AND (lease_until IS NULL OR lease_until < ?) AND attempts < 5 LIMIT 25",
  )
    .bind(now)
    .all<{
      id: string;
      event_key: string;
      recipient: string;
      subject: string;
      body: string;
    }>();
  for (const row of results) {
    if (!allowed.has(row.recipient.toLowerCase())) {
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE email_outbox SET status='blocked' WHERE id=?",
        ).bind(row.id),
        env.DB.prepare(
          "UPDATE notifications SET status='blocked' WHERE event_key=?",
        ).bind(row.event_key),
      ]);
      continue;
    }
    const lease = new Date(Date.now() + 5 * 60000).toISOString();
    const claimed = await env.DB.prepare(
      "UPDATE email_outbox SET status='sending', attempts=attempts+1, lease_until=? WHERE id=? AND status IN ('pending','failed','sending') AND (lease_until IS NULL OR lease_until < ?)",
    )
      .bind(lease, row.id, now)
      .run();
    if (!claimed.meta.changes) continue;
    try {
      const { EmailMessage } = await import("cloudflare:email");
      const clean = (value: string) => value.replace(/[\r\n]/g, "");
      const raw = `From: ${clean(env.EMAIL_FROM)}\r\nTo: ${clean(row.recipient)}\r\nSubject: ${clean(row.subject)}\r\nMessage-ID: <${row.id}@cpe-passport.scribo>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${row.body}`;
      await env.SEND_EMAIL.send(
        new EmailMessage(env.EMAIL_FROM, row.recipient, raw),
      );
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE email_outbox SET status='sent',sent_at=?,lease_until=NULL WHERE id=?",
        ).bind(now, row.id),
        env.DB.prepare(
          "UPDATE notifications SET status='sent',sent_at=? WHERE event_key=?",
        ).bind(now, row.event_key),
      ]);
    } catch {
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE email_outbox SET status='failed',lease_until=? WHERE id=?",
        ).bind(lease, row.id),
        env.DB.prepare(
          "UPDATE notifications SET status='failed' WHERE event_key=?",
        ).bind(row.event_key),
      ]);
    }
  }
}
