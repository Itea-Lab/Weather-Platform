import type { Handler } from "aws-lambda";
import { env } from "$amplify/env/add-thing";
import {
  IoTClient,
  CreateThingCommand,
  AddThingToThingGroupCommand,
  AttachPolicyCommand,
  AttachThingPrincipalCommand,
  DescribeEndpointCommand,
  CreateKeysAndCertificateCommand,
  UpdateCertificateCommand,
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

  try {
    // Validate inputs
    if (!thingGroupName || !policyName) {
      throw new Error(
        "AWS_IOT_THING_GROUP_NAME and AWS_IOT_POLICY_NAME must be defined"
      );
    }

    // Dynamically get AWS account ID
    const callerIdentity = await sts.send(new GetCallerIdentityCommand({}));
    const accountId = callerIdentity.Account;

    // Get IoT endpoint that devices will use to connect
    const endpointResponse = await iot.send(
      new DescribeEndpointCommand({
        endpointType: "iot:Data-ATS", // ATS endpoint for device connections
      })
    );
    const iotEndpoint = endpointResponse.endpointAddress;


    // Step 1: Create IoT Thing, create certificate and keys
    const certResponse = await iot.send(
      new CreateKeysAndCertificateCommand({ setAsActive: true })
    );
    const certificateArn = certResponse.certificateArn!;

    await iot.send(
      new CreateThingCommand({
        thingName,
        attributePayload: {
          attributes: {
            createdAt: new Date().toISOString(),
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
        principal: certificateArn,
      })
    );

    // Step 4: Attach Policy to Certificate (device permissions)
    await iot.send(
      new AttachPolicyCommand({
        policyName,
        target: certificateArn,
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
        // Device connection information
        deviceConnectionInfo: {
          endpoint: iotEndpoint,
          port: 8883,
          protocol: "MQTTS",
          topics: {
            publish: `weatherPlatform/telemetry`,
          },
        },
        certificates: {
          certificateArn,
          certificatePem: certResponse.certificatePem,
          privateKey: certResponse.keyPair?.PrivateKey,
          publicKey: certResponse.keyPair?.PublicKey,
        },
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