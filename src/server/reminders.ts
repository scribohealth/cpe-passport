import { hkDate } from "../shared/config";
import type { AppEnv } from "./env";

// Called by the scheduled Worker, or directly by a developer test with a simulated date.
export async function scheduleReminders(env: AppEnv, date = new Date()) {
  const today = hkDate(date);
  const year = Number(today.slice(0, 4));
  // An expired previous-year certificate still needs an update at New Year.
  // Ignore future-year uploads until they are applicable to the simulated/current date.
  const superseded = `SELECT d.id FROM documents d WHERE d.type='practising' AND EXISTS
    (SELECT 1 FROM documents n WHERE n.owner_id=d.owner_id AND n.type=d.type AND n.licence_year<=?
    AND (n.licence_year>d.licence_year OR (n.licence_year=d.licence_year AND n.version>d.version)))`;
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE email_outbox SET status='suppressed' WHERE status IN ('pending','failed','blocked') AND event_key IN (SELECT event_key FROM notifications WHERE channel='email' AND certificate_id IN (${superseded}))`,
    ).bind(year),
    env.DB.prepare(
      `UPDATE notifications SET status='suppressed' WHERE status IN ('queued','failed','blocked','saved') AND certificate_id IN (${superseded})`,
    ).bind(year),
  ]);
  const { results } = await env.DB.prepare(
    `SELECT d.*,u.email FROM documents d JOIN user u ON u.id=d.owner_id
    WHERE d.type='practising' AND d.licence_year<=? AND d.valid_until IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM documents n WHERE n.owner_id=d.owner_id AND n.type=d.type AND n.licence_year<=?
      AND (n.licence_year>d.licence_year OR (n.licence_year=d.licence_year AND n.version>d.version)))`,
  )
    .bind(year, year)
    .all<{
      id: string;
      owner_id: string;
      valid_until: string;
      email: string;
    }>();
  const leadDays = (env.REMINDER_LEAD_DAYS || "30,7")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0 && n < 366);
  for (const doc of results) {
    const days = Math.round(
      (Date.parse(doc.valid_until) - Date.parse(today)) / 86400000,
    );
    const trigger =
      days < 0 ? "expired" : leadDays.includes(days) ? `${days}days` : null;
    if (!trigger) continue;
    const message =
      days < 0
        ? "Your annual practising certificate has expired. Please upload an updated certificate."
        : `Your annual practising certificate expires on ${doc.valid_until}. Please upload an updated certificate.`;
    const key = `renewal:${doc.id}:${trigger}`;
    const now = date.toISOString();
    await env.DB.batch([
      env.DB.prepare(
        "INSERT OR IGNORE INTO notifications (id,owner_id,certificate_id,event_key,channel,message,status,created_at) VALUES (?,?,?,?, 'in_app',?,'saved',?)",
      ).bind(
        crypto.randomUUID(),
        doc.owner_id,
        doc.id,
        `${key}:in_app`,
        message,
        now,
      ),
      env.DB.prepare(
        "INSERT OR IGNORE INTO notifications (id,owner_id,certificate_id,event_key,channel,message,status,created_at) VALUES (?,?,?,?, 'email',?,'queued',?)",
      ).bind(
        crypto.randomUUID(),
        doc.owner_id,
        doc.id,
        `${key}:email`,
        message,
        now,
      ),
      env.DB.prepare(
        "INSERT OR IGNORE INTO email_outbox (id,owner_id,event_key,recipient,subject,body,created_at) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        doc.owner_id,
        `${key}:email`,
        doc.email,
        "Scribo demo: practising certificate update",
        `PRIVATE DEMONSTRATION\n${message}\nSign in to your passport: ${env.APP_URL}\nDocument receipt does not imply professional verification.`,
        now,
      ),
    ]);
  }
}
