const [date, server = "http://localhost:5173"] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || Number.isNaN(Date.parse(date)))
  throw new Error(
    "Usage: npm run reminders:simulate -- YYYY-MM-DD [http://localhost:5173]",
  );
const url = new URL("/cdn-cgi/local/scheduled", server);
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  throw new Error(
    "This simulation is restricted to a local development server.",
  );
url.searchParams.set("time", String(Date.parse(`${date}T09:00:00+08:00`)));
url.searchParams.set("cron", "0 1 * * *");
const response = await fetch(url);
if (!response.ok)
  throw new Error(
    `Local reminder simulation failed (${response.status}). Start npm run dev first.`,
  );
console.log(
  `Completed local reminder simulation for ${date} (Hong Kong). Check notifications and the local outbox. No external email is sent in outbox mode.`,
);
