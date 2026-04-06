import { redirect } from "react-router";
import { getLogoutUrl } from "../lib/auth0.server";
import { destroySessionHeaders } from "../lib/session.server";

export async function loader() {
  const headers = await destroySessionHeaders();
  return redirect(getLogoutUrl(), { headers });
}
