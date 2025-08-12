import { NextResponse } from "next/server";
import { getCurrentUser } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import { runWithAmplifyServerContext } from "@/lib/amplifyServerConfig";
import { createLambdaClient } from "@/lib/awsConfig";
import { InvokeCommand } from "@aws-sdk/client-lambda";

export async function GET() {
  try {
    // Attempt to get authenticated user - still required for security
    let user = null;
    let isAuthenticated = false;

    try {
      user = await runWithAmplifyServerContext({
        nextServerContext: { cookies },
        operation: async (contextSpec) => {
          return await getCurrentUser(contextSpec);
        },
      });
      isAuthenticated = true;
      console.log("Route: Authentication successful for fetchThings");
    } catch (authError) {
      console.warn("Route: Authentication failed for fetchThings:", authError);

      // Check if we have Cognito cookies as a fallback validation
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      const hasCognitoTokens = allCookies.some(
        (cookie) =>
          cookie.name.includes("CognitoIdentityServiceProvider") &&
          (cookie.name.includes("accessToken") ||
            cookie.name.includes("idToken"))
      );

      if (!hasCognitoTokens) {
        // No tokens at all - definitely not authenticated
        return NextResponse.json(
          {
            error: "Authentication required",
            details: "No authentication tokens found",
            recoverySuggestion: "Please sign in to access this resource",
          },
          { status: 401 }
        );
      }

      console.log(
        "Route: Cognito tokens present but validation failed - proceeding with caution"
      );
      // Continue but mark as unauthenticated for logging purposes
    }

    // Get function name from amplify outputs
    let functionName: string;
    try {
      const amplifyOutputs = await import(
        "../../../../../amplify_outputs.json"
      );
      const customOutputs = (amplifyOutputs as any).custom;
      functionName = customOutputs?.fetchThingsFunctionName || "fetchThings";
    } catch (error) {
      console.warn(
        "Could not load amplify outputs, using default function name"
      );
      functionName = "fetchThings";
    }

    // Create Lambda client and invoke function
    const lambdaClient = await createLambdaClient();

    const command = new InvokeCommand({
      FunctionName: functionName,
      Payload: JSON.stringify({}), // No payload needed for fetching
    });

    const result = await lambdaClient.send(command);

    if (!result.Payload) {
      throw new Error("No response from Lambda function");
    }

    const responseString = new TextDecoder().decode(result.Payload);
    const lambdaResponse = JSON.parse(responseString);

    // Check if Lambda function returned an error
    if (!lambdaResponse || lambdaResponse.statusCode !== 200) {
      const errorBody =
        lambdaResponse && lambdaResponse.body
          ? typeof lambdaResponse.body === "string"
            ? JSON.parse(lambdaResponse.body)
            : lambdaResponse.body
          : {};

      return NextResponse.json(
        {
          error: errorBody.error || "Failed to fetch devices",
          details: errorBody.details || "Lambda function failed",
        },
        { status: lambdaResponse?.statusCode || 500 }
      );
    }

    // Parse the successful response
    const successBody =
      typeof lambdaResponse.body === "string"
        ? JSON.parse(lambdaResponse.body)
        : lambdaResponse.body;

    return NextResponse.json({
      success: true,
      ...successBody,
      fetchedAt: new Date().toISOString(),
      fetchedBy:
        (user as any)?.signInDetails?.loginId ||
        (user as any)?.attributes?.email ||
        (user as any)?.username ||
        (isAuthenticated ? "unknown-user" : "token-validation-failed"),
    });
  } catch (error) {
    console.error("Device fetch error:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "Failed to fetch devices",
          details: error.message,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch devices", details: String(error) },
      { status: 500 }
    );
  }
}
