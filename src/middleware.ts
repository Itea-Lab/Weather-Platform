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
      console.log(
        "Middleware: Authenticating request for:",
        request.nextUrl.pathname
      );

      const user = await runWithAmplifyServerContext({
        nextServerContext: { cookies },
        operation: async (contextSpec) => {
          const currentUser = await getCurrentUser(contextSpec);
          console.log(
            "Middleware: Authentication successful for user:",
            (currentUser as any)?.userId || (currentUser as any)?.username
          );
          return currentUser;
        },
      });

      console.log("Middleware: Allowing authenticated request to proceed");
    } catch (error: any) {
      console.log(
        "Middleware: Authentication failed for:",
        request.nextUrl.pathname,
        "Error:",
        error?.message
      );
      return NextResponse.json(
        {
          error: "Authentication required",
          details: error?.message || "User not authenticated",
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
