import { NextResponse } from "next/server";
import { InvokeCommand } from "@aws-sdk/client-lambda";
import { authenticateAPI } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // Authentication already validated by middleware - get user info for logging
    const user = await authenticateAPI("register");
    console.log(
      `Route: User info for register: ${user?.username || "authenticated-user"}`
    );

    // Skip auth check since middleware already validated - always proceed

    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
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
      const { createLambdaClient } = await import("@/lib/awsConfig");

      const functionName = await getAmplifyFunctionName();
      const lambdaClient = await createLambdaClient();

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
      registeredBy: user?.email || user?.username || "authenticated-user",
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
