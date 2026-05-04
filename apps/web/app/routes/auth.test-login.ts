import type { Route } from "./+types/auth.test-login";
import { userRepository } from "../repositories/user.repository";
import { createTestSessionHeaders } from "../lib/session.server";

export async function action({ request }: Route.ActionArgs) {
  console.log("[test-login] action called");
  if (process.env.E2E_AUTH_BYPASS !== "1") {
    return new Response("Not Found", { status: 404 });
  }

  console.log("[test-login] E2E_AUTH_BYPASS is enabled, proceeding with test login");
  const { email, name } = (await request.json()) as { email: string; name: string };

  console.log("[test-login] Received test login request", { email, name });
  if (!email || !name) {
    return new Response("Bad Request", { status: 400 });
  }
  console.log("[test-login] Checking if user exists in DB");

  let user = await userRepository.findByEmail(email);

  console.log("[test-login] User lookup result", { user: user ? { id: user.id, email: user.email } : null });
  if (!user) {
    user = await userRepository.create({ email, name });

    console.log("[test-login] Created new user", { user: { id: user.id, email: user.email } });
  }

  console.log("[test-login] Final user object", { user: { id: user.id, email: user.email } });

  const headers = await createTestSessionHeaders(email);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify({ user }), { status: 200, headers });
}
