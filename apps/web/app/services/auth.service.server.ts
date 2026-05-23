import { ForbiddenError } from "~/lib/errors";
import { exchangeCodeForTokens, verifyAccessToken } from "../lib/auth0.server";
import { getSessionToken, getTestSessionEmail } from "../lib/session.server";
import { userRepository } from "../repositories/user.repository.server";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  permissions: string[];
};

export async function handleCallback(code: string): Promise<{
  accessToken: string;
  user: AuthUser;
}> {
  const tokens = await exchangeCodeForTokens(code);
  const payload = await verifyAccessToken(tokens.access_token);

  const email = payload.email;
  const name = payload.name || email || "Unknown";

  if (!email) {
    throw new Error("No email in token payload");
  }

  // Sync user to local DB on first login
  let user = await userRepository.findByEmail(email);
  if (!user) {
    user = await userRepository.create({ email, name });
  }

  return {
    accessToken: tokens.access_token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      permissions: payload.permissions ?? [],
    },
  };
}

export async function getAuthenticatedUser(request: Request): Promise<AuthUser | null> {
  if (process.env.E2E_AUTH_BYPASS === "1") {
    const email = await getTestSessionEmail(request);
    if (!email) return null;
    const user = await userRepository.findByEmail(email);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      permissions: ["read:books", "write:books", "read:notes", "write:notes"],
    };
  }

  const token = await getSessionToken(request);
  if (!token) return null;

  try {
    const payload = await verifyAccessToken(token);
    const email = payload.email;
    if (!email) return null;

    const user = await userRepository.findByEmail(email);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      permissions: payload.permissions ?? [],
    };
  } catch {
    return null;
  }
}

export function requirePermission(user: AuthUser, permission: string): void {
  if (!user.permissions.includes(permission)) {
    throw new ForbiddenError(`User does not have permission: ${permission}`);
  }
}
