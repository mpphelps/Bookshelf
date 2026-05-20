import { redirect } from "react-router";
import type { Route } from "./+types/auth.logout";
import { getLogoutUrl } from "../lib/auth0.server";
import { destroySessionHeaders } from "../lib/session.server";

export async function loader({ request }: Route.LoaderArgs) {
  const headers = await destroySessionHeaders();
  return redirect(getLogoutUrl(request), { headers });
}
