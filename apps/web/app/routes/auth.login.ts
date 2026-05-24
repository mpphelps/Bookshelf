import { redirect } from "react-router";
import { getAuthorizationUrl } from "../lib/auth0.server";

export function loader() {
  const authorizationUrl = getAuthorizationUrl();
  console.log("Redirecting to Auth0 authorization URL:", authorizationUrl);
  return redirect(authorizationUrl);
}
