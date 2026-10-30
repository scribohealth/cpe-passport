import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "./env";

// Enabled only by the managed Previews config. Never trust forwarded-host headers
// or accept arbitrary workers.dev / other applications in the same account.
export function requestEnvironment(env: AppEnv, request: Request): AppEnv {
  if (!env.PREVIEW_WORKER_HOST) return env;
  const url = new URL(request.url);
  const suffix = `-${env.PREVIEW_WORKER_HOST}`;
  const prefix = url.hostname.endsWith(suffix)
    ? url.hostname.slice(0, -suffix.length)
    : "";
  if (
    url.protocol !== "https:" ||
    url.port ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(prefix)
  ) {
    throw new HTTPException(403, {
      message: "This hostname is not an allowed application Preview.",
    });
  }
  return { ...env, APP_URL: url.origin };
}
