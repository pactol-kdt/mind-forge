import { auth } from "@/lib/auth/auth";

/** Derive the authenticated user from the session — never trust client userId. */
export async function requireSessionUserId(): Promise<
  { ok: true; userId: string; email?: string | null; name?: string | null; image?: string | null } | { ok: false; status: number; error: string }
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, status: 401, error: "UNAUTHORIZED" };
  }
  return {
    ok: true,
    userId,
    email: session.user?.email,
    name: session.user?.name,
    image: session.user?.image,
  };
}
