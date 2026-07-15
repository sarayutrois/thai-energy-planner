import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/battery/") || pathname.startsWith("/api/ev/")) {
    return NextResponse.json(
      {
        error: "feature_unavailable",
        message: "ฟีเจอร์นี้กำลังปรับปรุงและยังไม่เปิดให้ใช้งาน",
      },
      { status: 404 },
    );
  }
  const token = process.env.ADMIN_ACCESS_TOKEN?.trim();
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  if (!token) {
    return new NextResponse("Admin route is not configured.", {
      status: 404,
    });
  }

  const providedToken =
    request.headers.get("x-admin-token") ??
    request.cookies.get("admin_access_token")?.value;

  if (providedToken !== token) {
    return new NextResponse("Admin authentication required.", {
      status: 401,
      headers: {
        "WWW-Authenticate": "Bearer",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/analysis/battery/:path*",
    "/analysis/ev/:path*",
    "/api/battery/:path*",
    "/api/ev/:path*",
  ],
};
