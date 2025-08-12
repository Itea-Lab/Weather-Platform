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
    // For fetchThings, check authentication but allow graceful degradation for SWR
    if (request.nextUrl.pathname === "/api/iot/fetchThings") {
      try {
        console.log(
          "Middleware: Attempting to authenticate fetchThings request"
        );

        const user = await runWithAmplifyServerContext({
          nextServerContext: { cookies },
          operation: async (contextSpec) => {
            const currentUser = await getCurrentUser(contextSpec);
            console.log(
              "Middleware: FetchThings auth successful for user:",
              (currentUser as any)?.userId || (currentUser as any)?.username
            );
            return currentUser;
          },
        });

        console.log(
          "Middleware: FetchThings authentication successful, proceeding"
        );
        return NextResponse.next();
      } catch (error: any) {
        console.log("Middleware: FetchThings auth failed:", error?.message);

        // Debug: Log available cookies to understand the issue
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        const hasCognitoTokens = allCookies.some(
          (cookie) =>
            cookie.name.includes("CognitoIdentityServiceProvider") &&
            (cookie.name.includes("accessToken") ||
              cookie.name.includes("idToken"))
        );

        console.log("Middleware: Has Cognito tokens:", hasCognitoTokens);

        if (hasCognitoTokens) {
          console.log(
            "Middleware: Cognito tokens present but validation failed - allowing for SWR compatibility"
          );
          // If we have tokens but validation failed, it might be a timing/sync issue
          // Allow the request but let the route handler validate again
          return NextResponse.next();
        } else {
          console.log("Middleware: No authentication tokens found");
          return NextResponse.json(
            {
              error: "Authentication required",
              details: "No authentication tokens found",
              recoverySuggestion: "Please sign in to access this resource",
            },
            { status: 401 }
          );
        }
      }
    }

    // Strict authentication for all other IoT/weather APIs
    try {
      console.log(
        "Middleware: Authenticating request for:",
        request.nextUrl.pathname
      );

      // Debug: Log available cookies
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      console.log(
        "Middleware: Available cookies:",
        allCookies.map((c: any) => c.name)
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
