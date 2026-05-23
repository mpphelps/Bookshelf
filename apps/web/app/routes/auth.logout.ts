import { redirect } from "react-router";
import type { Route } from "./+types/auth.logout";
import { getLogoutUrl } from "../lib/auth0.server";
import { destroySessionHeaders } from "../lib/session.server";

export async function loader({}: Route.LoaderArgs) {
  const headers = await destroySessionHeaders();
  return redirect(getLogoutUrl(), { headers });
}
