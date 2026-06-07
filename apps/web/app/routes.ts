import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("/", "routes/shelves.tsx", [
    route("books/new", "routes/books/new.tsx"),
  ]),
  route("shelves/:shelf", "routes/shelves/$shelf.tsx"),
  route("books/:bookId", "routes/books/$bookId.tsx", [
    route("notes/new", "routes/books/$bookId/notes/new.tsx"),
    route("notes/:noteId/edit", "routes/books/$bookId/notes/$noteId/edit.tsx"),
  ]),
  route("health", "routes/health.tsx"),
  route("robots.txt", "routes/robots.ts"),
  route("sitemap.xml", "routes/sitemap.ts"),
  route("auth/login", "routes/auth.login.ts"),
  route("auth/callback", "routes/auth.callback.ts"),
  route("auth/logout", "routes/auth.logout.ts"),
  route("auth/test-login", "routes/auth.test-login.ts"),
] satisfies RouteConfig;
