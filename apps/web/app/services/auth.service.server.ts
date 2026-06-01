import { ForbiddenError } from "~/lib/errors";
import { exchangeCodeForTokens, verifyAccessToken, verifyIdToken } from "../lib/auth0.server";
import { getSessionToken, getTestSessionEmail } from "../lib/session.server";
import { userRepository } from "../repositories/user.repository.server";
import { splitName } from "~/lib/name";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  permissions: string[];
};

export async function handleCallback(code: string): Promise<{
  accessToken: string;
  user: AuthUser;
}> {
  const tokens = await exchangeCodeForTokens(code);
  const [identity, authz] = await Promise.all([verifyIdToken(tokens.id_token), verifyAccessToken(tokens.access_token)]);

  const email = identity.email;
  if (!email) {
    throw new Error("No email in ID token");
  }

  const name = identity.name || email;

  const { firstName, lastName } = identity.given_name
    ? { firstName: identity.given_name, lastName: identity.family_name ?? null }
    : splitName(name);

  // Sync user to local DB on first login
  let user = await userRepository.findByEmail(email);
  if (!user) {
    user = await userRepository.create({ email, firstName, lastName });
  }

  return {
    accessToken: tokens.access_token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      permissions: authz.permissions ?? [],
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
      firstName: user.firstName,
      lastName: user.lastName,
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
      firstName: user.firstName,
      lastName: user.lastName,
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
