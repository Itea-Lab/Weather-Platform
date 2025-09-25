import { IoTClient, DescribeEndpointCommand } from "@aws-sdk/client-iot";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

export const handler = async (event: any) => {
  console.log("getIoTEndpoint Lambda invoked");

  try {
    // Get the region from AWS environment variable
    const region =
      process.env.DEFAULT_REGION || "us-east-1";
    console.log(`Using region: ${region}`);

    // Get account ID using STS
    const stsClient = new STSClient({ region });
    const callerIdentity = await stsClient.send(
      new GetCallerIdentityCommand({})
    );
    const accountId = callerIdentity.Account;
    console.log(`Account ID: ${accountId}`);

    // Initialize IoT client with dynamic region
    const iotClient = new IoTClient({ region });

    // Get the IoT Core endpoint
    const endpointResponse = await iotClient.send(
      new DescribeEndpointCommand({
        endpointType: "iot:Data-ATS", // ATS endpoint for device connections
      })
    );

    if (!endpointResponse.endpointAddress) {
      throw new Error("Could not retrieve IoT Core endpoint address");
    }

    const endpoint = endpointResponse.endpointAddress;
    console.log(
      `Retrieved IoT Core endpoint: ${endpoint} in region: ${region}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        endpoint,
        region,
        accountId,
        websocketUrl: `wss://${endpoint}/mqtt`,
        message: "IoT endpoint retrieved successfully",
      }),
    };
  } catch (error) {
    console.error("❌ Error getting IoT endpoint:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: "Failed to get IoT endpoint",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
