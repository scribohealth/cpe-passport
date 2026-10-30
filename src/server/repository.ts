import { emptyProfile } from "../shared/model";
import type { Application, DocumentRecord, Profile } from "../shared/model";
import { statement, institutions, cycles } from "../shared/config";
import type { AppEnv } from "./env";

export type ApplicationRow = {
  id: string;
  owner_id: string;
  version: number;
  data: string;
  state: "draft" | "submitted";
  attestation: string | null;
  attested_context: string | null;
  reference: string | null;
  snapshot: string | null;
  submitted_at: string | null;
};
export const documentColumns =
  "id,type,filename,mime,licence_year,valid_until,version,uploaded_at";
export async function ownProfile(env: AppEnv, owner: string) {
  const row = await env.DB.prepare(
    "SELECT data,version FROM profiles WHERE owner_id=?",
  )
    .bind(owner)
    .first<{ data: string; version: number }>();
  return {
    profile: row ? (JSON.parse(row.data) as Profile) : emptyProfile,
    version: row?.version ?? 0,
  };
}
export async function ownDocuments(env: AppEnv, owner: string) {
  const { results } = await env.DB.prepare(
    `SELECT ${documentColumns} FROM documents WHERE owner_id=? ORDER BY version DESC,uploaded_at DESC,id DESC`,
  )
    .bind(owner)
    .all<DocumentRecord>();
  return results;
}
export function applicationView(row: ApplicationRow): Application {
  return {
    id: row.id,
    version: row.version,
    data: JSON.parse(row.data),
    state: row.state,
    reference: row.reference,
    submitted_at: row.submitted_at,
    snapshot: row.snapshot ? JSON.parse(row.snapshot) : null,
    signed: !!row.attestation,
  };
}
export async function ownApplication(env: AppEnv, owner: string, id: string) {
  return env.DB.prepare("SELECT * FROM applications WHERE id=? AND owner_id=?")
    .bind(id, owner)
    .first<ApplicationRow>();
}
export async function signingContext(
  env: AppEnv,
  owner: string,
  row: ApplicationRow,
  email: string,
) {
  const [profile, documents] = await Promise.all([
    ownProfile(env, owner),
    ownDocuments(env, owner),
  ]);
  const data = JSON.parse(row.data);
  const context = {
    profileVersion: profile.version,
    documentIds: documents.map((d) => d.id).sort(),
    email,
    answers: data,
    statement,
    institution: institutions.find((i) => i.id === data.institutionId),
    cycle: cycles.find((c) => c.id === data.cycleId),
  };
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(context)),
  );
  return {
    ...profile,
    documents,
    hash: Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join(""),
  };
}
