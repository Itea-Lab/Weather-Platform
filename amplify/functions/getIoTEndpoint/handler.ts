import { IoTClient, DescribeEndpointCommand } from "@aws-sdk/client-iot";

export const handler = async (event: any) => {
  console.log("getIoTEndpoint Lambda invoked");

  try {
    // Initialize IoT client
    const iotClient = new IoTClient({ region: "us-east-1" });

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
    console.log(`✅ Retrieved IoT Core endpoint: ${endpoint}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        endpoint,
        region: "us-east-1",
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
