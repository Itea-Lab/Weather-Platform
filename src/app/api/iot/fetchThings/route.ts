import { NextResponse } from "next/server";
import { authenticateAPI } from "@/lib/auth";
import { createLambdaClient } from "@/lib/awsConfig";
import { InvokeCommand } from "@aws-sdk/client-lambda";

export async function GET() {
  try {
    // Authentication already validated by middleware - get user info for logging
    const user = await authenticateAPI("fetchThings");
    console.log(
      `Route: User info for fetchThings: ${
        user?.username || "authenticated-user"
      }`
    );

    // Get function name from amplify outputs
    let functionName: string;
    try {
      const amplifyOutputs = await import(
        "../../../../../amplify_outputs.json"
      );
      const customOutputs = (
        amplifyOutputs as { custom?: { fetchThingsFunctionName?: string } }
      ).custom;
      functionName = customOutputs?.fetchThingsFunctionName || "fetchThings";
    } catch {
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
      fetchedBy: user?.email || user?.username || "authenticated-user",
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
