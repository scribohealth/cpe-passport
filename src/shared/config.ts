export const salutations = ["Mr.", "Ms.", "Miss", "Dr.", "Prof."] as const;
export const statement = {
  version: "sample-2026-01",
  title: "Sample personal data collection statement",
  text: "PRIVATE DEMONSTRATION — SYNTHETIC DATA ONLY. Scribo Limited stores the information and document versions you submit to demonstrate a pharmacist enrolment workflow. This sample is not an approved collection statement. No information is forwarded to CUHK or any other institution. Your signature attests to this demonstration application only; it is not certified identity or professional verification.",
};
export const institutions = [
  {
    id: "cuhk-sop",
    name: "School of Pharmacy, CUHK",
    enabled: true,
    questionVersion: "cuhk-category-1",
    question: "Which category do you belong to?",
    options: [
      {
        id: "sop-full-time",
        label: "Current full-time staff of School of Pharmacy, CUHK.",
      },
      {
        id: "sop-adjunct",
        label: "Current adjunct / honorary staff of School of Pharmacy, CUHK.",
      },
      {
        id: "mcp-student",
        label:
          "Current students of Master of Clinical Pharmacy (MCP) programme offered by the School of Pharmacy, CUHK.",
      },
      { id: "medical-center", label: "Current Staff of CUHK Medical Center." },
      { id: "cuhk-full-time", label: "Current full-time staff of CUHK." },
    ],
  },
];
// Explicit, versioned records; independent of practising-certificate licence years.
export const cycles = [
  {
    id: "cpe-2026",
    label: "2026–2027",
    start: "2026-06-01",
    end: "2027-05-31",
    timezone: "Asia/Hong_Kong",
    version: 1,
  },
  {
    id: "cpe-2027",
    label: "2027–2028",
    start: "2027-06-01",
    end: "2028-05-31",
    timezone: "Asia/Hong_Kong",
    version: 1,
  },
  {
    id: "cpe-2028",
    label: "2028–2029",
    start: "2028-06-01",
    end: "2029-05-31",
    timezone: "Asia/Hong_Kong",
    version: 1,
  },
];
export function hkDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function availableCycles(date = new Date()) {
  const today = hkDate(date);
  const current = cycles.findIndex((c) => c.start <= today && today <= c.end);
  return current < 0 ? [] : cycles.slice(current, current + 2);
}
