import { Link, Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse } from "react-router";

import type { Route } from "./+types/root";
import { RouteErrorPanel } from "~/components/layout/route-error-panel";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Michroma&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap",
  },
  { rel: "canonical", href: "https://readingbookshelf.com" },
];

export const meta: Route.MetaFunction = () => [
  { title: "Bookshelf — track your reading" },
  {
    name: "description",
    content:
      "A personal book tracker. Move books across Want to Read, Reading, and Finished shelves; rate finished books; capture notes as you read.",
  },
  { name: "theme-color", content: "#0a0a0a" },
  { property: "og:type", content: "website" },
  { property: "og:site_name", content: "Bookshelf" },
  { property: "og:title", content: "Bookshelf — track your reading" },
  {
    property: "og:description",
    content: "Track your reading across Want to Read, Reading, and Finished shelves.",
  },
  { property: "og:url", content: "https://readingbookshelf.com" },
  { name: "twitter:card", content: "summary" },
  { name: "twitter:title", content: "Bookshelf — track your reading" },
  {
    name: "twitter:description",
    content: "Track your reading across Want to Read, Reading, and Finished shelves.",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

function BrandmarkHeader() {
  return (
    <header className="border-b border-border/80 bg-background/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 text-xs sm:px-6">
        <Link to="/" className="display !text-[12px]">
          BOOKSHELF
        </Link>
      </div>
    </header>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error)) {
    return (
      <>
        <BrandmarkHeader />
        <RouteErrorPanel status={error.status} message={error.data} />
      </>
    );
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const stack = import.meta.env.DEV && error instanceof Error ? error.stack : undefined;

  return (
    <>
      <BrandmarkHeader />
      <RouteErrorPanel status={500} message={message} />
      {stack && (
        <pre className="mx-auto max-w-3xl px-6 pb-12 overflow-x-auto font-mono text-xs text-muted-foreground">
          <code>{stack}</code>
        </pre>
      )}
    </>
  );
}
