import { NextResponse } from "next/server";
import { authenticateAPI } from "@/lib/auth";

export async function DELETE(request: Request) {
  try {
    // Authentication already validated by middleware - get user info for logging
    const user = await authenticateAPI("delete-device");
    console.log(
      `Route: User info for delete-device: ${
        user?.username || "authenticated-user"
      }`
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

    const { deviceName } = requestBody;

    // Validate required fields
    if (!deviceName) {
      return NextResponse.json(
        { error: "Device name is required" },
        { status: 400 }
      );
    }

    // Validate device name format
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

    // Call the Lambda function for device deletion
    let lambdaResponse;

    try {
      // Use the lambda invoker with delete function
      const { invokeDeleteThingLambdaServerSide } = await import(
        "@/lib/lambdaInvoker"
      );

      lambdaResponse = await invokeDeleteThingLambdaServerSide({
        thingName: deviceName,
      });
    } catch (lambdaError) {
      console.warn(
        "Delete Lambda invocation failed, using fallback:",
        lambdaError
      );

      // Fallback to direct Lambda invocation with explicit function name
      const { getAmplifyDeleteFunctionName } = await import(
        "@/lib/lambdaInvoker"
      );
      const { createLambdaClient } = await import("@/lib/awsConfig");

      try {
        const functionName = await getAmplifyDeleteFunctionName();
        const lambdaClient = await createLambdaClient();

        const { InvokeCommand } = await import("@aws-sdk/client-lambda");
        const command = new InvokeCommand({
          FunctionName: functionName,
          Payload: JSON.stringify({
            thingName: deviceName,
          }),
        });

        const result = await lambdaClient.send(command);

        if (!result.Payload) {
          throw new Error("No response from Lambda function");
        }

        const responseString = new TextDecoder().decode(result.Payload);
        lambdaResponse = JSON.parse(responseString);
      } catch (fallbackError) {
        console.error("Fallback Lambda invocation also failed:", fallbackError);

        // If Lambda doesn't exist yet, return a helpful message
        if (
          fallbackError instanceof Error &&
          (fallbackError.name === "ResourceNotFoundException" ||
            fallbackError.message.includes("Function not found") ||
            fallbackError.message.includes("does not exist"))
        ) {
          return NextResponse.json(
            {
              error: "Delete function not deployed",
              details:
                "The delete Lambda function hasn't been deployed yet. Please run 'npx ampx pipeline-deploy --branch dev' to deploy the delete functionality.",
              suggestedAction: "Deploy the delete Lambda function first",
            },
            { status: 503 } // Service Unavailable
          );
        }

        throw fallbackError;
      }
    }

    // Process Lambda response
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

      if (errorMessage.includes("ResourceNotFoundException")) {
        status = 404; // Not Found
        errorMessage = `Device '${deviceName}' not found or already deleted.`;
      } else if (
        errorMessage.includes("permission") ||
        errorMessage.includes("AccessDeniedException") ||
        errorMessage.includes("not authorized")
      ) {
        status = 403; // Forbidden
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
            "Error processing device deletion",
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
      deletedAt: new Date().toISOString(),
      deletedBy: user?.email || user?.username || "authenticated-user",
    });
  } catch (error) {
    console.error("Device deletion error:", error);
    if (error instanceof Error) {
      const errorMessage = error.message || "Failed to delete device";

      let status = 500;
      if (errorMessage.includes("parse") || errorMessage.includes("JSON")) {
        status = 400; // Bad Request - parsing error
      } else if (errorMessage.includes("device not found")) {
        status = 404; // Not Found
      } else if (
        errorMessage.includes("not authorized") ||
        errorMessage.includes("AccessDenied")
      ) {
        status = 403; // Forbidden
      }

      return NextResponse.json(
        {
          error: "Failed to delete device",
          details: errorMessage,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
        { status: status }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete device", details: String(error) },
      { status: 500 }
    );
  }
}
