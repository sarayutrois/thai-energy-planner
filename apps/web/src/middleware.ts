import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = process.env.ADMIN_ACCESS_TOKEN;
  const shouldProtectAdmin = request.nextUrl.pathname.startsWith("/admin") && token && process.env.NODE_ENV === "production";
  if (!shouldProtectAdmin) return NextResponse.next();

  const providedToken =
    request.headers.get("x-admin-token") ??
    request.cookies.get("admin_access_token")?.value ??
    request.nextUrl.searchParams.get("admin_token");

  if (providedToken !== token) {
    return new NextResponse("Admin authentication required.", {
      status: 401,
      headers: {
        "WWW-Authenticate": "Bearer"
      }
    });
  }

  const response = NextResponse.next();
  if (request.nextUrl.searchParams.has("admin_token")) {
    response.cookies.set("admin_access_token", token, {
      httpOnly: true,
      maxAge: 60 * 60 * 8,
      sameSite: "strict",
      secure: true
    });
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*"]
};
