import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import { runWithAmplifyServerContext } from "@/lib/amplifyServerConfig";

export async function middleware(request: NextRequest) {
  // Only protect API routes, not page routes
  if (
    request.nextUrl.pathname.startsWith("/api/weather/") ||
    request.nextUrl.pathname.startsWith("/api/iot/")
  ) {
    try {
      await runWithAmplifyServerContext({
        nextServerContext: { cookies },
        operation: async (contextSpec) => {
          await getCurrentUser(contextSpec);
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/weather/:path*", "/api/iot/:path*"],
};
