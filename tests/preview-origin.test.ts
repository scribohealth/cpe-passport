import { describe, expect, test } from "vitest";
import { requestEnvironment } from "../src/server/request-env";
import type { AppEnv } from "../src/server/env";

const preview = {
  APP_URL: "https://staging-cpe.scribo.com.hk",
  PREVIEW_WORKER_HOST: "cpe-passport.scribo.workers.dev",
} as AppEnv;
describe("managed branch Preview origins", () => {
  test.each(["feat-phase-1-passport", "fix-login", "123-fix-login"])(
    "resolves %s without changing the shared environment",
    (branch) => {
      const origin = `https://${branch}-cpe-passport.scribo.workers.dev`;
      const env = requestEnvironment(
        preview,
        new Request(`${origin}/api/auth/sign-in/email`),
      );
      expect(env.APP_URL).toBe(origin);
      expect(preview.APP_URL).toBe("https://staging-cpe.scribo.com.hk");
    },
  );
  test.each([
    "https://evil.example",
    "https://branch-other-worker.scribo.workers.dev",
    "https://branch-cpe-passport.other-account.workers.dev",
    "https://branch-cpe-passport.scribo.workers.dev.evil.example",
    "https://evil.branch-cpe-passport.scribo.workers.dev",
    "http://branch-cpe-passport.scribo.workers.dev",
    "https://branch-cpe-passport.scribo.workers.dev:8443",
  ])("rejects an unapproved origin: %s", (origin) => {
    expect(() => requestEnvironment(preview, new Request(origin))).toThrow(
      "not an allowed",
    );
  });
  test("ignores forwarded host headers", () => {
    expect(() =>
      requestEnvironment(
        preview,
        new Request("https://evil.example", {
          headers: {
            "X-Forwarded-Host": "fix-login-cpe-passport.scribo.workers.dev",
          },
        }),
      ),
    ).toThrow();
  });
  test("production and standalone staging retain their fixed origins", () => {
    for (const APP_URL of [
      "https://cpe.scribo.com.hk",
      "https://staging-cpe.scribo.com.hk",
    ]) {
      const env = { APP_URL } as AppEnv;
      expect(
        requestEnvironment(
          env,
          new Request("https://branch-cpe-passport.scribo.workers.dev"),
        ),
      ).toBe(env);
    }
  });
});
