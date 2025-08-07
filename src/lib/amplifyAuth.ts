import { NextResponse } from "next/server";
import { getCurrentUser } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import { runWithAmplifyServerContext } from "@/lib/amplifyServerConfig";

export async function withAuth(
  request: Request,
  handler: (req: Request, context: { user: any }) => Promise<Response>
) {
  try {
    const user = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        try {
          return await getCurrentUser(contextSpec);
        } catch (userError) {
          console.error("getCurrentUser error:", userError);
          throw userError;
        }
      },
    });

    console.log(
      "Successfully authenticated user:",
      user?.username || user?.userId
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
      },
      { status: 401 }
    );
  }
}
