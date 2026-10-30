import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import stylesheet from "../styles.css?url";
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Scribo · CPE Passport" },
      {
        name: "description",
        content:
          "Your Hong Kong pharmacist passport. Private Phase 1 demonstration by Scribo.",
      },
    ],
    links: [{ rel: "stylesheet", href: stylesheet }],
  }),
  component: Root,
  notFoundComponent: () => (
    <main className="not-found">
      <h1>Page not found</h1>
      <a href="/">Return to your passport</a>
    </main>
  ),
});
function Root() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
