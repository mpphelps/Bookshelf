import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/shelves.tsx"),
  route("shelves/:shelf", "routes/shelves/$shelf.tsx"),
  route("books/new", "routes/books/new.tsx"),
  route("books/:bookId", "routes/books/$bookId.tsx"),
  route("health", "routes/health.tsx"),
  route("auth/login", "routes/auth.login.ts"),
  route("auth/callback", "routes/auth.callback.ts"),
  route("auth/logout", "routes/auth.logout.ts"),
  route("auth/test-login", "routes/auth.test-login.ts"),
] satisfies RouteConfig;
