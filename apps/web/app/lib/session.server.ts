import { createCookie } from "react-router";

export const sessionCookie = createCookie("__session", {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
  secrets: [process.env.SESSION_SECRET!],
});

export async function getSessionToken(request: Request): Promise<string | null> {
  const cookieHeader = request.headers.get("Cookie");
  const session = await sessionCookie.parse(cookieHeader);
  return session?.token || null;
}

export async function createSessionHeaders(token: string): Promise<Headers> {
  const headers = new Headers();
  headers.append("Set-Cookie", await sessionCookie.serialize({ token }));
  return headers;
}

export async function getTestSessionEmail(request: Request): Promise<string | null> {
  const cookieHeader = request.headers.get("Cookie");
  const session = await sessionCookie.parse(cookieHeader);
  return session?.email || null;
}

export async function getTestSessionPermissions(request: Request): Promise<string[] | null> {
  const cookieHeader = request.headers.get("Cookie");
  const session = await sessionCookie.parse(cookieHeader);
  return Array.isArray(session?.permissions) ? session.permissions : null;
}

export async function createTestSessionHeaders(email: string, permissions?: string[]): Promise<Headers> {
  const headers = new Headers();
  headers.append("Set-Cookie", await sessionCookie.serialize({ email, permissions }));
  return headers;
}

export async function destroySessionHeaders(): Promise<Headers> {
  const headers = new Headers();
  headers.append("Set-Cookie", await sessionCookie.serialize(null, { maxAge: 0 }));
  return headers;
}
