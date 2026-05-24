import type { Route } from "./+types/health";

export function loader() {
  return { status: "ok" };
}

export default function Health({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h1>Health Check</h1>
      <p>Status: {loaderData.status}</p>
    </div>
  );
}
