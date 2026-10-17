import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/server/session";

/**
 * 只負責：刷新 Supabase session cookie、未登入導向 /login。
 * 角色／資料權限一律在伺服器端（requireAdmin／requireVendor）與 RLS 判斷。
 */
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ["/vendor/:path*", "/admin/:path*"],
};
