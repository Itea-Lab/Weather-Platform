import type { Handler } from "aws-lambda";
import { env } from "$amplify/env/add-thing";
import {
  IoTClient,
  CreateThingCommand,
  AddThingToThingGroupCommand,
  AttachPolicyCommand,
  AttachThingPrincipalCommand,
  DescribeEndpointCommand,
} from "@aws-sdk/client-iot";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

export const handler: Handler = async (event) => {
  const region = process.env.AWS_REGION!;
  
  // Initialize AWS clients
  const iot = new IoTClient({ region });
  const sts = new STSClient({ region }); // STS for getting current AWS account info

  const thingName = event.thingName || `Thing-${Date.now()}`;
  const thingGroupName = env.AWS_IOT_THING_GROUP_NAME;
  const policyName = env.AWS_IOT_POLICY_NAME;
  const principal = event.principal; // Certificate ARN from device registration

  try {
    // Validate inputs
    if (!thingGroupName || !policyName) {
      throw new Error(
        "AWS_IOT_THING_GROUP_NAME and AWS_IOT_POLICY_NAME must be defined"
      );
    }
    if (!principal) {
      throw new Error(
        "Principal (certificate ARN) is required to attach policy"
      );
    }

    // Dynamically get AWS account ID (no secrets needed!)
    const callerIdentity = await sts.send(new GetCallerIdentityCommand({}));
    const accountId = callerIdentity.Account;

    // Get IoT endpoint that devices will use to connect
    const endpointResponse = await iot.send(
      new DescribeEndpointCommand({
        endpointType: "iot:Data-ATS", // ATS endpoint for device connections
      })
    );
    const iotEndpoint = endpointResponse.endpointAddress;

    console.log(`Region: ${region}`);
    console.log(`Account ID: ${accountId}`);
    console.log(`IoT Endpoint for devices: ${iotEndpoint}`);
    console.log(`Policy: ${policyName}`);
    console.log(`Creating Thing: ${thingName}`);

    // Step 1: Create IoT Thing (represents your weather sensor)
    await iot.send(
      new CreateThingCommand({
        thingName,
        attributePayload: {
          attributes: {
            createdAt: new Date().toISOString(),
            // Store connection info for later device configuration
            iotEndpoint: iotEndpoint || "unknown",
            accountId: accountId || "unknown",
          },
        },
      })
    );

    // Step 2: Add Thing to Thing Group (organize devices)
    await iot.send(
      new AddThingToThingGroupCommand({
        thingName,
        thingGroupName,
      })
    );

    // Step 3: Attach Thing to Certificate (device authentication)
    await iot.send(
      new AttachThingPrincipalCommand({
        thingName,
        principal,
      })
    );

    // Step 4: Attach Policy to Certificate (device permissions)
    await iot.send(
      new AttachPolicyCommand({
        policyName,
        target: principal,
      })
    );

    // Return connection details for device configuration
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Weather sensor ${thingName} registered successfully`,
        thingName,
        thingGroup: thingGroupName,
        policy: policyName,
        // 🔌 Device connection information
        deviceConnectionInfo: {
          endpoint: iotEndpoint,
          port: 8883,
          protocol: "MQTT over TLS",
          topics: {
            publish: `weather/data/${thingName}`,
            subscribe: `weather/commands/${thingName}`,
          },
          certificateArn: principal,
        },
        accountId,
      }),
    };
  } catch (error) {
    console.error("Error registering weather sensor:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to register weather sensor",
        details: error instanceof Error ? error.message : String(error),
        thingName: thingName
      })
    };
  }
};