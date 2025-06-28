import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import { getCurrentUser } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import outputs from "../amplify_outputs.json";

const { runWithAmplifyServerContext } = createServerRunner({ config: outputs });

export async function middleware(request: NextRequest) {
  // Only protect API routes, not page routes
  if (request.nextUrl.pathname.startsWith("/api/weather/")) {
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
  matcher: ["/api/weather/:path*"],
};
