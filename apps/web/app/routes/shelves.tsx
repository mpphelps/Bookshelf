import { redirect } from "react-router";
import type { Route } from "./+types/shelves";
import { getAuthenticatedUser } from "../services/auth.service";
import { getShelvesOverview } from "../services/book.service";
import { Button } from "@bookshelf/ui/components/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@bookshelf/ui/components/card";

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

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome, {user.name}
        </h1>
        <Button variant="outline" asChild>
          <a href="/auth/logout">Logout</a>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {shelves.map((shelf) => (
          <a key={shelf.key} href={`/shelves/${shelf.key}`}>
            <Card className="transition-shadow hover:shadow-[0_0_20px_oklch(0.75_0.15_195/0.15)]">
              <CardHeader>
                <CardTitle>{shelf.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-primary">{shelf.count}</p>
                <p className="text-sm text-muted-foreground mt-1">books</p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
