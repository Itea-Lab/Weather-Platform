import { NextResponse } from "next/server";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { IoTClient, DescribeEndpointCommand } from "@aws-sdk/client-iot";
import { invokeLambda } from "@/lib/lambdaInvoker";

export async function GET() {
  console.log("Getting IoT endpoint for account...");

  // Try Lambda function first (which has proper IAM permissions and region detection)
  try {
    const lambdaResponse = await invokeLambda("getIoTEndpointFunctionName", {});

    if (lambdaResponse.success && lambdaResponse.endpoint) {
      return NextResponse.json({
        success: true,
        endpoint: lambdaResponse.endpoint,
        region: lambdaResponse.region,
        accountId: lambdaResponse.accountId,
        websocketUrl: lambdaResponse.websocketUrl,
        message: "IoT endpoint retrieved successfully via Lambda",
      });
    }

    throw new Error(lambdaResponse.error || "Lambda function failed");
  } catch (lambdaError) {
    console.log(
      "❌ Lambda approach failed, trying direct AWS SDK fallback...",
      lambdaError
    );
  }

  // Fallback to direct AWS SDK approach
  try {
    // Get region from environment variable as fallback only
    const region =
      process.env.DEFAULT_REGION || "us-east-1";
    console.log(`Using fallback region: ${region}`);

    // Create STS client to get account identity
    const stsClient = new STSClient({ region });
    const callerIdentity = await stsClient.send(
      new GetCallerIdentityCommand({})
    );
    const accountId = callerIdentity.Account;
    console.log(`Account ID: ${accountId}`);

    // Create IoT client and get endpoint
    const iotClient = new IoTClient({ region });
    const endpointResponse = await iotClient.send(
      new DescribeEndpointCommand({
        endpointType: "iot:Data-ATS",
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
      message:
        "IoT endpoint retrieved successfully using direct AWS SDK fallback",
    });
  } catch (directError) {
    console.error(
      "❌ Both Lambda and direct AWS SDK approaches failed:",
      directError
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get IoT endpoint",
        details:
          directError instanceof Error ? directError.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
