import { redirect } from "react-router";
import type { Route } from "./+types/shelves";
import { getAuthenticatedUser } from "../services/auth.service";
import { getShelvesOverview } from "../services/book.service";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return redirect("/auth/login");
  }

  const shelves = await getShelvesOverview(user);
  return { user, shelves };
}

export default function Shelves({ loaderData }: Route.ComponentProps) {
  const { user, shelves } = loaderData;
  console.log("Loader data:", loaderData);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Welcome, {user.name}</h1>
        <a href="/auth/logout" className="text-sm text-gray-500 hover:text-gray-700">
          Logout
        </a>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {shelves.map((shelf) => (
          <a
            key={shelf.key}
            href={`/shelves/${shelf.key}`}
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">{shelf.label}</h2>
            <p className="text-4xl font-bold text-blue-600">{shelf.count}</p>
            <p className="text-sm text-gray-500 mt-1">books</p>
          </a>
        ))}
      </div>
    </div>
  );
}
