import { NextResponse } from "next/server";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { getCurrentUser } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import { runWithAmplifyServerContext } from "@/lib/amplifyServerConfig";

export async function POST(request: Request) {
  try {
    // Get the authenticated user (middleware already validated auth)
    const user = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        return await getCurrentUser(contextSpec);
      },
    });

    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          error: "Invalid request format",
          details: "The request body could not be parsed as JSON",
        },
        { status: 400 }
      );
    }

    const { deviceName, thingGroup, connectionType } = requestBody;

    // Validate required fields
    if (!deviceName) {
      return NextResponse.json(
        { error: "Device name is required" },
        { status: 400 }
      );
    }

    if (!thingGroup) {
      return NextResponse.json(
        { error: "Thing Group is required" },
        { status: 400 }
      );
    }

    if (!connectionType) {
      return NextResponse.json(
        { error: "Connection Type is required" },
        { status: 400 }
      );
    }

    // Validate device name format (AWS IoT Thing names have specific requirements)
    const thingNameRegex = /^[a-zA-Z0-9:_-]+$/;
    if (!thingNameRegex.test(deviceName)) {
      return NextResponse.json(
        {
          error: "Invalid device name format",
          details:
            "Device name can only contain alphanumeric characters, colons, underscores, and hyphens",
        },
        { status: 400 }
      );
    }

    // Only MQTTS supported for now
    if (connectionType !== "MQTTS") {
      return NextResponse.json(
        {
          error: "Invalid connection type",
          details: "Only MQTTS connection type is currently supported",
        },
        { status: 400 }
      );
    }

    // Call the Lambda function
    let lambdaResponse;

    try {
      // Use the new lambda invoker that reads from amplify outputs
      const { invokeAddThingLambdaServerSide } = await import(
        "@/lib/lambdaInvoker"
      );

      lambdaResponse = await invokeAddThingLambdaServerSide({
        thingName: deviceName,
        thingGroup: thingGroup,
      });
    } catch (lambdaError) {
      console.warn("Lambda invocation failed:", lambdaError);

      // Fallback to direct Lambda invocation with explicit function name
      const { getAmplifyFunctionName } = await import("@/lib/lambdaInvoker");
      const functionName = await getAmplifyFunctionName();

      const lambdaClient = new LambdaClient({
        region: process.env.AWS_REGION,
      });

      const command = new InvokeCommand({
        FunctionName: functionName,
        Payload: JSON.stringify({
          thingName: deviceName,
          thingGroup: thingGroup,
        }),
      });

      const result = await lambdaClient.send(command);

      if (!result.Payload) {
        throw new Error("No response from Lambda function");
      }

      const responseString = new TextDecoder().decode(result.Payload);
      lambdaResponse = JSON.parse(responseString);
    }

    // Process Lambda response
    // Check if Lambda function returned an error
    if (!lambdaResponse || lambdaResponse.statusCode !== 200) {
      const errorBody =
        lambdaResponse && lambdaResponse.body
          ? typeof lambdaResponse.body === "string"
            ? JSON.parse(lambdaResponse.body)
            : lambdaResponse.body
          : {};

      // Check for common IoT errors
      let status = 500;
      let errorMessage = errorBody.error || "Lambda function failed";

      // Handle specific Lambda error cases
      if (
        errorMessage.includes("already exists") ||
        errorMessage.includes("ResourceAlreadyExistsException")
      ) {
        status = 409; // Conflict
        errorMessage = `Device '${deviceName}' already exists. Please use a different name.`;
      } else if (
        errorMessage.includes("permission") ||
        errorMessage.includes("AccessDeniedException") ||
        errorMessage.includes("not authorized")
      ) {
        status = 403; // Forbidden
      } else if (errorMessage.includes("ResourceNotFoundException")) {
        status = 404; // Not Found
      } else if (
        errorMessage.includes("validation") ||
        errorMessage.includes("ValidationException") ||
        errorMessage.includes("InvalidRequest")
      ) {
        status = 400; // Bad Request
      } else if (
        errorMessage.includes("throttling") ||
        errorMessage.includes("ThrottlingException")
      ) {
        status = 429; // Too Many Requests
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details:
            errorBody.details ||
            errorBody.message ||
            "Error processing device registration",
        },
        { status: status }
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
      registeredAt: new Date().toISOString(),
      registeredBy:
        (user as any)?.signInDetails?.loginId ||
        (user as any)?.attributes?.email ||
        (user as any)?.username,
    });
  } catch (error) {
    console.error("Device registration error:", error);
    if (error instanceof Error) {
      const errorMessage = error.message || "Failed to register device";

      // Try to determine error type from the message
      let status = 500;
      if (errorMessage.includes("parse") || errorMessage.includes("JSON")) {
        status = 400; // Bad Request - parsing error
      } else if (errorMessage.includes("device already exists")) {
        status = 409; // Conflict - duplicate resource
      }

      return NextResponse.json(
        {
          error: "Failed to register device",
          details: errorMessage,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
        { status: status }
      );
    }
    return NextResponse.json(
      { error: "Failed to register device", details: String(error) },
      { status: 500 }
    );
  }
}
