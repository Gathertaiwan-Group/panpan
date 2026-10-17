import { NextResponse } from "next/server";
import { userDb } from "@/lib/server/user-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const db = await userDb();
  await db.auth.signOut();
  return NextResponse.redirect(new URL("/login?signed_out=1", req.url), 303);
}
