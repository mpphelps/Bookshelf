import { RouteErrorPanel } from "~/components/layout/route-error-panel";
import type { Route } from "./+types/health";
import { isRouteErrorResponse } from "react-router";

export function loader() {
  return { status: "ok" };
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error)) {
    return (
      <RouteErrorPanel
        microLabel="record sealed"
        status={error.status}
        message={error.data}
        description="this volume is not accessible from your terminal."
      />
    );
  }
  throw error;
}

export default function Health({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h1>Health Check</h1>
      <p>Status: {loaderData.status}</p>
    </div>
  );
}
