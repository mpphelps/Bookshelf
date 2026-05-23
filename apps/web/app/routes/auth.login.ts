import { redirect } from "react-router";
import type { Route } from "./+types/auth.login";
import { getAuthorizationUrl } from "../lib/auth0.server";

export function loader({}: Route.LoaderArgs) {
  const authorizationUrl = getAuthorizationUrl();
  console.log("Redirecting to Auth0 authorization URL:", authorizationUrl);
  return redirect(authorizationUrl);
}
