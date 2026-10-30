import { z } from "zod";
import { salutations, cycles, institutions } from "./config";
import type { DocumentRecord, DraftValues, Profile } from "./model";

export const profileSchema = z
  .object({
    salutation: z.union([z.enum(salutations), z.literal("")]),
    firstName: z.string().max(120),
    lastName: z.string().max(120),
    chineseName: z.string().max(120),
    preferredName: z.string().max(120),
    phone: z.string().max(40),
    partialId: z
      .string()
      .regex(
        /^\d{0,4}$/,
        "Enter only the first four digits, never a full identifier.",
      ),
    licenceNumber: z.string().max(80),
  })
  .strict();
export const draftSchema = z
  .object({
    cycleId: z.string().max(80),
    institutionId: z.string().max(80),
    previousEnrolment: z.enum(["", "yes", "no"]),
    effectiveDate: z.string().max(10),
    category: z.string().max(80),
  })
  .strict()
  .transform((data) => ({
    ...data,
    effectiveDate: data.previousEnrolment === "yes" ? data.effectiveDate : "",
  }));
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function currentDocuments(documents: DocumentRecord[], today: string) {
  const year = Number(today.slice(0, 4));
  return {
    registration: documents.find((d) => d.type === "registration"),
    practising: documents.find(
      (d) => d.type === "practising" && d.licence_year === year,
    ),
  };
}
export function passportIssues(
  profile: Profile,
  documents: DocumentRecord[],
  today: string,
) {
  const issues: string[] = [];
  for (const [field, label] of [
    ["salutation", "Salutation"],
    ["firstName", "First name"],
    ["lastName", "Last name as shown in ID card"],
    ["licenceNumber", "Pharmacist licence registration number"],
  ] as const) {
    if (!profile[field]?.trim()) issues.push(`${label} is required.`);
  }
  if (!/^\d{4}$/.test(profile.partialId))
    issues.push(
      "The first four digits of your ID card or passport number are required.",
    );
  const current = currentDocuments(documents, today);
  if (!current.registration)
    issues.push("Upload a pharmacist registration certificate.");
  if (!current.practising)
    issues.push(
      `Upload an annual practising certificate for ${today.slice(0, 4)}.`,
    );
  else if (!current.practising.valid_until)
    issues.push("Complete the practising-certificate validity-end date.");
  else if (current.practising.valid_until < today)
    issues.push("Your practising certificate has expired. Upload an update.");
  return issues;
}
export function enrolmentIssues(data: DraftValues) {
  const issues: string[] = [];
  const cycle = cycles.find((c) => c.id === data.cycleId);
  if (!cycle) issues.push("Select a configured CPE cycle.");
  if (!["yes", "no"].includes(data.previousEnrolment))
    issues.push("Answer the previous enrolment question.");
  if (
    data.previousEnrolment === "yes" &&
    (!validDate(data.effectiveDate) ||
      !cycle ||
      data.effectiveDate < cycle.start ||
      data.effectiveDate > cycle.end)
  )
    issues.push(
      "The effective date must fall within the selected cycle (demo validation).",
    );
  const institution = institutions.find(
    (i) => i.id === data.institutionId && i.enabled,
  );
  if (!institution?.questionVersion || !institution.options.length)
    issues.push("Select an administrator with a confirmed question set.");
  else if (!institution.options.some((o) => o.id === data.category))
    issues.push("Select one applicable administrator category.");
  return issues;
}
export function signatureValid(method: string, value: string) {
  if (method === "typed")
    return value.trim().length >= 2 && value.length <= 240;
  if (method !== "drawn" || value.length > 100000) return false;
  try {
    const strokes: unknown = JSON.parse(value);
    return (
      Array.isArray(strokes) &&
      strokes.length <= 100 &&
      strokes.some((s) => Array.isArray(s) && s.length >= 3) &&
      strokes.every(
        (s) =>
          Array.isArray(s) &&
          s.length <= 2000 &&
          s.every(
            (p) =>
              Array.isArray(p) &&
              p.length === 2 &&
              p.every(
                (n) =>
                  typeof n === "number" &&
                  Number.isFinite(n) &&
                  n >= 0 &&
                  n <= 1000,
              ),
          ),
      ) &&
      new Set(strokes.flat().map((p) => JSON.stringify(p))).size >= 3
    );
  } catch {
    return false;
  }
}
