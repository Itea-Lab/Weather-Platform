import { NextResponse } from "next/server";
import { withAuth } from "@/lib/amplifyAuth";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

export async function POST(request: Request) {
  return withAuth(request, async (req: Request, { user }: { user: any }) => {
    try {
      const { deviceName, thingGroup, connectionType } = await req.json();

      // Validate required fields
      if (!deviceName || !thingGroup || !connectionType) {
        return NextResponse.json(
          {
            error:
              "All fields are required: deviceName, thingGroup, connectionType",
          },
          { status: 400 }
        );
      }

      // Validate device name format (AWS IoT Thing names have specific requirements)
      const thingNameRegex = /^[a-zA-Z0-9:_-]+$/;
      if (!thingNameRegex.test(deviceName)) {
        return NextResponse.json(
          {
            error:
              "Device name can only contain alphanumeric characters, colons, underscores, and hyphens",
          },
          { status: 400 }
        );
      }

      // Only MQTTS supported for now
      if (connectionType !== "MQTTS") {
        return NextResponse.json(
          { error: "Only MQTTS connection type is currently supported" },
          { status: 400 }
        );
      }

      // Initialize Lambda client
      const lambdaClient = new LambdaClient({
        region: process.env.AWS_REGION,
      });

      // Call your Lambda function
      const command = new InvokeCommand({
        FunctionName: process.env.ADD_THING_LAMBDA_FUNCTION_NAME || "add-thing",
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
      const lambdaResponse = JSON.parse(responseString);

      // Check if Lambda function returned an error
      if (lambdaResponse.statusCode !== 200) {
        const errorBody =
          typeof lambdaResponse.body === "string"
            ? JSON.parse(lambdaResponse.body)
            : lambdaResponse.body;
        throw new Error(errorBody.error || "Lambda function failed");
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
        registeredBy: user.email || user.username,
      });
    } catch (error) {
      console.error("Device registration error:", error);
      return NextResponse.json(
        {
          error: "Failed to register device",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  });
}
