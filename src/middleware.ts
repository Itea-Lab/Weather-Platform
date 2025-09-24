import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateMiddleware } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  // Only protect API routes, not page routes
  if (
    request.nextUrl.pathname.startsWith("/api/weather/") ||
    request.nextUrl.pathname.startsWith("/api/iot/")
  ) {
    // Apply secure authentication for all protected routes
    const isAuthenticated = await authenticateMiddleware(
      `Middleware[${request.nextUrl.pathname}]`
    );

    if (isAuthenticated) {
      return NextResponse.next();
    } else {
      console.log("Middleware: Authentication failed");
      return NextResponse.json(
        {
          error: "Authentication required",
          details: "No valid authentication tokens found",
          recoverySuggestion: "Please sign in to access this resource",
        },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/weather/:path*", "/api/iot/:path*"],
};
