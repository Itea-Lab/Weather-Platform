import { NextResponse } from "next/server";
import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import { getCurrentUser } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import outputs from "../../amplify_outputs.json";

const { runWithAmplifyServerContext } = createServerRunner({ config: outputs });

export async function withAuth(
  request: Request,
  handler: (req: Request, context: { user: any }) => Promise<Response>
) {
  try {
    const user = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        return await getCurrentUser(contextSpec);
      },
    });

    return await handler(request, { user });
  } catch (error) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
}
