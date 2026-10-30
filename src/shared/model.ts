export type Profile = {
  salutation: string;
  firstName: string;
  lastName: string;
  chineseName: string;
  preferredName: string;
  phone: string;
  partialId: string;
  licenceNumber: string;
};
export const emptyProfile: Profile = {
  salutation: "",
  firstName: "",
  lastName: "",
  chineseName: "",
  preferredName: "",
  phone: "",
  partialId: "",
  licenceNumber: "",
};
export type DocumentRecord = {
  id: string;
  type: "registration" | "practising";
  filename: string;
  mime: string;
  licence_year: number | null;
  valid_until: string | null;
  version: number;
  uploaded_at: string;
};
export type DraftValues = {
  cycleId: string;
  institutionId: string;
  previousEnrolment: "" | "yes" | "no";
  effectiveDate: string;
  category: string;
};
export const emptyDraft: DraftValues = {
  cycleId: "",
  institutionId: "",
  previousEnrolment: "",
  effectiveDate: "",
  category: "",
};
export type Attestation = {
  method: "typed" | "drawn";
  value: string;
  acknowledged: boolean;
};
export type Application = {
  id: string;
  version: number;
  state: "draft" | "submitted";
  data: DraftValues;
  reference: string | null;
  submitted_at: string | null;
  snapshot: Snapshot | null;
  signed: boolean;
};
export type Snapshot = {
  profile: Profile & { email: string };
  profileVersion: number;
  documents: DocumentRecord[];
  answers: DraftValues;
  institution: unknown;
  cycle: unknown;
  statement: { version: string; text: string };
  attestation: Attestation & { timestamp: string };
  pairing: "Not confirmed";
};
export type NotificationRecord = {
  id: string;
  message: string;
  channel: "in_app" | "email";
  status: string;
  created_at: string;
  read_at: string | null;
};
export type Bootstrap = {
  user: { id: string; email: string; emailVerified: boolean; name: string };
  profile: Profile;
  profileVersion: number;
  documents: DocumentRecord[];
  applications: Application[];
  notifications: NotificationRecord[];
};
