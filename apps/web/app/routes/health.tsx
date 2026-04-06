import { prisma } from "@bookshelf/database";
import type { Route } from "./+types/health";

export async function loader({ request }: Route.LoaderArgs) {
  const userCount = await prisma.user.count();
  return { status: "ok", userCount };
}

export default function Health({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h1>Health Check</h1>
      <p>Status: {loaderData.status}</p>
      <p>User Count: {loaderData.userCount}</p>
    </div>
  );
}
