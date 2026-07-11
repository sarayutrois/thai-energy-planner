import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const experimentalModule = experimentalModuleForPath(pathname);
  if (
    experimentalModule &&
    process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL_MODULES !== "true"
  ) {
    const unavailable = new URL("/analysis/unavailable", request.url);
    unavailable.searchParams.set("module", experimentalModule);
    return NextResponse.rewrite(unavailable);
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
    "/analysis/ecosystem/:path*",
    "/analysis/solar/config/:path*",
    "/analysis/solar/results/:path*",
    "/analysis/solar/sizing/:path*",
    "/analysis/solar/finance/:path*",
    "/analysis/solar/sensitivity/:path*",
  ],
};

function experimentalModuleForPath(pathname: string) {
  if (pathname.startsWith("/analysis/battery")) return "battery";
  if (pathname.startsWith("/analysis/ev")) return "ev";
  if (pathname.startsWith("/analysis/ecosystem")) return "ecosystem";
  if (pathname.startsWith("/analysis/solar/")) return "solar_detail";
  return null;
}
