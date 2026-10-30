import start from "@tanstack/react-start/server-entry";
import api from "../server/api";
import { scheduleReminders } from "../server/reminders";
import { deliverMail } from "../server/mail";
import type { AppEnv } from "../server/env";

export default {
  async fetch(request: Request, env: AppEnv, ctx: ExecutionContext) {
    if (new URL(request.url).pathname.startsWith("/api/"))
      return api.fetch(request, env, ctx);
    const response = await start.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("X-Frame-Options", "DENY");
    return new Response(response.body, { status: response.status, headers });
  },
  async scheduled(event: ScheduledEvent, env: AppEnv, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        await scheduleReminders(env, new Date(event.scheduledTime));
        await deliverMail(env);
      })(),
    );
  },
};
