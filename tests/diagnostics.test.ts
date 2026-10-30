import { afterEach, describe, expect, test, vi } from "vitest";
import api from "../src/server/api";
import { failureCode, reportFailure } from "../src/server/diagnostics";
import type { AppEnv } from "../src/server/env";

afterEach(() => vi.restoreAllMocks());

describe("safe authentication diagnostics", () => {
  test.each([
    ["", "AUTH_SECRET_MISSING"],
    ["too-short", "AUTH_SECRET_TOO_SHORT"],
  ])(
    "identifies invalid secret configuration without logging values",
    async (secret, code) => {
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      const env = {
        APP_URL: "https://staging-cpe.scribo.com.hk",
        BETTER_AUTH_SECRET: secret,
      } as AppEnv;
      const response = await api.fetch(
        new Request(
          "https://staging-cpe.scribo.com.hk/api/auth/sign-in/email",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Origin: env.APP_URL,
            },
            body: JSON.stringify({
              email: "private@example.test",
              password: "never-log-this-password",
            }),
          },
        ),
        env,
      );
      expect(response.status).toBe(500);
      const body = (await response.json()) as {
        requestId: string;
        error: string;
      };
      expect(body.requestId).toBe(response.headers.get("X-Request-ID"));
      expect(body.error).toContain(body.requestId);
      expect(JSON.parse(log.mock.calls[0][0])).toEqual({
        event: "request.failed",
        code,
        requestId: body.requestId,
      });
      expect(JSON.stringify(log.mock.calls)).not.toMatch(
        /private@example|never-log|too-short/,
      );
    },
  );

  test("classifies nested D1 failures while omitting SQL, personal data and stacks", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = new Error(
      "D1_ERROR: no such table: user; SQL private@example.test token-secret",
    );
    const error = new Error("query failed with personal contents", { cause });
    reportFailure(error, "test-reference");
    expect(JSON.parse(log.mock.calls[0][0])).toEqual({
      event: "request.failed",
      code: "DB_MIGRATIONS_REQUIRED",
      requestId: "test-reference",
    });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(
      /private@example|token-secret|personal contents|SQL/,
    );
    expect(failureCode(new Error("no such column: example"))).toBe(
      "DB_SCHEMA_MISMATCH",
    );
    expect(failureCode(new Error("Drizzle schema mismatch"))).toBe(
      "DB_SCHEMA_MISMATCH",
    );
  });
});
