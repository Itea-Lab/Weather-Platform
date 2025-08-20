import { NextResponse } from "next/server";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { IoTClient, DescribeEndpointCommand } from "@aws-sdk/client-iot";
import { invokeLambda } from "@/lib/lambdaInvoker";

export async function GET(request: Request) {
  try {
    console.log("Getting IoT endpoint for account...");

    const region = "us-east-1"; // Use your known region

    // First try direct AWS SDK approach (works in some environments)
    try {
      // Create STS client to get account identity
      const stsClient = new STSClient({ region });

      // Get account identity first (this often works better for credentials)
      const callerIdentity = await stsClient.send(
        new GetCallerIdentityCommand({})
      );
      const accountId = callerIdentity.Account;

      console.log(`Account ID: ${accountId}`);

      // Create IoT client with same region and credentials
      const iotClient = new IoTClient({ region });

      // Get the IoT endpoint
      const endpointResponse = await iotClient.send(
        new DescribeEndpointCommand({
          endpointType: "iot:Data-ATS", // ATS endpoint for device connections
        })
      );

      if (!endpointResponse.endpointAddress) {
        throw new Error("Could not retrieve IoT Core endpoint address");
      }

      const endpoint = endpointResponse.endpointAddress;
      console.log(`Retrieved IoT Core endpoint: ${endpoint}`);

      return NextResponse.json({
        success: true,
        endpoint,
        region,
        accountId,
        websocketUrl: `wss://${endpoint}/mqtt`,
        message: "IoT endpoint retrieved successfully using direct AWS SDK",
      });
    } catch (directError) {
      console.log(
        "❌ Direct AWS SDK failed, trying Lambda fallback...",
        directError
      );

      // Fallback to Lambda function (which has proper IAM permissions)
      try {
        const lambdaResponse = await invokeLambda(
          "getIoTEndpointFunctionName",
          {}
        );

        if (!lambdaResponse.success || !lambdaResponse.endpoint) {
          throw new Error(lambdaResponse.error || "Lambda function failed");
        }

        return NextResponse.json({
          success: true,
          endpoint: lambdaResponse.endpoint,
          region: lambdaResponse.region,
          websocketUrl: lambdaResponse.websocketUrl,
          message: "IoT endpoint retrieved successfully via Lambda fallback",
        });
      } catch (lambdaError) {
        console.error("❌ Lambda fallback also failed:", lambdaError);
        throw lambdaError;
      }
    }
  } catch (error) {
    console.error("❌ Error getting IoT endpoint:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get IoT endpoint",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
