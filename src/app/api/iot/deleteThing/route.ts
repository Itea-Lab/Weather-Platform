import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { InvokeCommand } from "@aws-sdk/client-lambda";
import { authenticateAPI } from "@/lib/auth";
import { createLambdaClientWithAmplifyContext } from "@/lib/awsConfig";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";

export async function DELETE(request: Request) {
  return runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (contextSpec) => {
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

        // Get function name from amplify outputs
        let functionName: string;
        try {
          const amplifyOutputs = await import(
            "../../../../../amplify_outputs.json"
          );
          const customOutputs = (
            amplifyOutputs as { custom?: { deleteThingFunctionName?: string } }
          ).custom;
          functionName =
            customOutputs?.deleteThingFunctionName || "deleteThing";
        } catch {
          console.warn(
            "Could not load amplify outputs, using default function name"
          );
          functionName = "deleteThing";
        }

        // Create Lambda client with Amplify context and invoke function
        const lambdaClient = await createLambdaClientWithAmplifyContext(
          contextSpec
        );

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
        const lambdaResponse = JSON.parse(responseString);

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
                process.env.NODE_ENV === "development"
                  ? error.stack
                  : undefined,
            },
            { status: status }
          );
        }
        return NextResponse.json(
          { error: "Failed to delete device", details: String(error) },
          { status: 500 }
        );
      }
    },
  });
}
