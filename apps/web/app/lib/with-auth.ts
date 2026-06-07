import { redirect } from "react-router";
import { getAuthenticatedUser, type AuthUser } from "~/services/auth.service.server";

type RouteArgs = {
  request: Request;
  params: Record<string, string | undefined>;
};

export function withAuth<TArgs extends RouteArgs, TReturn>(
  handler: (args: TArgs & { user: AuthUser }) => Promise<TReturn>,
) {
  return async (args: TArgs): Promise<TReturn> => {
    const user = await getAuthenticatedUser(args.request);
    if (!user) throw redirect("/auth/login");
    return handler({ ...args, user });
  };
}
