import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./auth-schema";
import type { AppEnv } from "./env";
import { enqueueMail } from "./mail";

export function createAuth(env: AppEnv) {
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32)
    throw new Error("Configure BETTER_AUTH_SECRET (32+ characters)");
  return betterAuth({
    appName: "Scribo CPE Passport",
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(drizzle(env.DB, { schema }), {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 1800,
      sendResetPassword: async ({ user, url, token }) => {
        await enqueueMail(
          env,
          user.id,
          `reset:${token}`,
          user.email,
          "Reset your Scribo password",
          `Private demonstration. Reset your password using this single-use link (30 minutes):\n${url}`,
        );
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      expiresIn: 3600,
      sendVerificationEmail: async ({ user, url, token }) => {
        await enqueueMail(
          env,
          user.id,
          `verify:${token}`,
          user.email,
          "Verify your Scribo email",
          `Private demonstration. Verify control of your email (one hour):\n${url}`,
        );
      },
    },
    user: { changeEmail: { enabled: true } },
    account: { accountLinking: { enabled: false } },
    socialProviders:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              disableImplicitSignUp: false,
            },
          }
        : {},
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 60, max: 3 },
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
      useSecureCookies: env.APP_URL.startsWith("https:"),
    },
    logger: { disabled: true },
  });
}
