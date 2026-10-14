import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // explain.solivana.ai → interpreter tool
  if (hostname.startsWith("explain.solivana.ai")) {
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/interpret";
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
