import { NextResponse } from "next/server";
import { requireSessionUserId } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rateLimit";
import { isDatabaseConfigured } from "@/lib/db/client";
import { deleteUserAccount } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "CLOUD_DISABLED" }, { status: 503 });
  }

  const authResult = await requireSessionUserId();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const limited = rateLimit(`delete:${authResult.userId}`, 3, 3_600_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  let confirm = false;
  try {
    const body = (await req.json()) as { confirm?: boolean };
    confirm = body.confirm === true;
  } catch {
    confirm = false;
  }

  if (!confirm) {
    return NextResponse.json(
      { error: "CONFIRMATION_REQUIRED" },
      { status: 400 }
    );
  }

  try {
    await deleteUserAccount(authResult.userId);
    return NextResponse.json({ status: "deleted" });
  } catch (err) {
    console.error("account_delete_failed", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
