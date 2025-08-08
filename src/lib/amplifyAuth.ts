import { NextResponse } from "next/server";
import { getCurrentUser } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import { runWithAmplifyServerContext } from "@/lib/amplifyServerConfig";

export async function withAuth(
  request: Request,
  handler: (req: Request, context: { user: any }) => Promise<Response>
) {
  try {
    // Get cookies function for the server context
    const cookiesFunction = cookies;

    console.log("Attempting authentication...");

    const user = await runWithAmplifyServerContext({
      nextServerContext: { cookies: cookiesFunction },
      operation: async (contextSpec) => {
        try {
          const currentUser = await getCurrentUser(contextSpec);
          console.log(
            "getCurrentUser successful:",
            (currentUser as any)?.username || (currentUser as any)?.userId
          );
          return currentUser;
        } catch (userError: any) {
          console.error("getCurrentUser error details:", {
            name: userError?.name,
            message: userError?.message,
            recoverySuggestion: userError?.recoverySuggestion,
          });
          throw userError;
        }
      },
    });

    console.log(
      "Successfully authenticated user:",
      (user as any)?.username || (user as any)?.userId
    );
    return await handler(request, { user });
  } catch (error) {
    console.error("Authentication failed:", error);
    return NextResponse.json(
      {
        error: "Authentication required",
        details:
          error instanceof Error
            ? error.message
            : "Unknown authentication error",
        recoverySuggestion: "Please sign in again to access this resource",
      },
      { status: 401 }
    );
  }
}
