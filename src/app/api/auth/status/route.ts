import { NextResponse } from "next/server";
import { getCurrentUser } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import { runWithAmplifyServerContext } from "@/lib/amplifyServerConfig";

export async function GET() {
  try {
    console.log("Auth status check: Starting...");

    const user = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        try {
          const currentUser = await getCurrentUser(contextSpec);
          console.log(
            "Auth status: User found:",
            (currentUser as any)?.username || (currentUser as any)?.userId
          );
          return currentUser;
        } catch (userError: any) {
          console.error("Auth status: getCurrentUser failed:", {
            name: userError?.name,
            message: userError?.message,
            recoverySuggestion: userError?.recoverySuggestion,
          });
          throw userError;
        }
      },
    });

    return NextResponse.json({
      authenticated: true,
      user: {
        username: (user as any)?.username,
        userId: (user as any)?.userId,
        email:
          (user as any)?.signInDetails?.loginId ||
          (user as any)?.attributes?.email,
      },
    });
  } catch (error: any) {
    console.error("Auth status check failed:", error);
    return NextResponse.json(
      {
        authenticated: false,
        error: error?.message || "Authentication failed",
        recoverySuggestion: error?.recoverySuggestion || "Please sign in again",
      },
      { status: 401 }
    );
  }
}
