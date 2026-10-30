export interface AppEnv {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  BETTER_AUTH_SECRET: string;
  APP_URL: string;
  PREVIEW_WORKER_HOST?: string;
  EMAIL_MODE: string;
  TEST_EMAIL_ALLOWLIST: string;
  EMAIL_FROM?: string;
  SEND_EMAIL?: SendEmail;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  MAX_UPLOAD_BYTES?: string;
  REMINDER_LEAD_DAYS?: string;
}
