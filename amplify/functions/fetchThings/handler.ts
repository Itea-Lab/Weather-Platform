import type { Handler } from "aws-lambda";
import { env } from "$amplify/env/fetchThings";
import {
  IoTClient,
  ListThingsInThingGroupCommand,
  DescribeThingCommand,
} from "@aws-sdk/client-iot";

export const handler: Handler = async (event) => {
  const region = process.env.DEFAULT_REGION!;

  // Initialize AWS IoT client
  const iot = new IoTClient({ region });

  const thingGroupName = env.AWS_IOT_THING_GROUP_NAME;

  try {
    // Validate inputs
    if (!thingGroupName) {
      throw new Error("AWS_IOT_THING_GROUP_NAME must be defined");
    }

    console.log(`Fetching devices from Thing Group: ${thingGroupName}`);

    // Step 1: Get list of things in the thing group
    const listThingsResponse = await iot.send(
      new ListThingsInThingGroupCommand({
        thingGroupName: thingGroupName,
      })
    );

    const thingNames = listThingsResponse.things || [];
    console.log(`Found ${thingNames.length} devices in group`);

    // Step 2: Get detailed information for each thing
    const devices = await Promise.all(
      thingNames.map(async (thingName) => {
        try {
          const thingDetails = await iot.send(
            new DescribeThingCommand({
              thingName: thingName,
            })
          );

          const device = {
            id: thingName,
            name: thingName,
            connectionType: "MQTTS" as const,
            group: thingGroupName,
            status: "online" as const, // Set all as online for now
            lastSeen: "", // Leave blank for future update
            signalStrength: 0, // Leave as 0 for future update
            thingTypeName: thingDetails.thingTypeName || "",
            version: thingDetails.version || 0,
            attributes: Object.fromEntries(
              Object.entries(thingDetails.attributes || {}).filter(
                ([key]) =>
                  !key.toLowerCase().includes("arn") &&
                  !key.toLowerCase().includes("key") &&
                  !key.toLowerCase().includes("secret")
              )
            ),
          };

          return device;
        } catch (error) {
          console.error(
            `Error fetching details for device ${thingName}:`,
            error
          );
          // Return basic info even if describe fails
          return {
            id: thingName,
            name: thingName,
            connectionType: "MQTTS" as const,
            group: thingGroupName,
            status: "online" as const,
            lastSeen: "",
            signalStrength: 0,
            thingTypeName: "",
            // Removed thingArn for security
            version: 0,
            attributes: {},
          };
        }
      })
    );

    // Sort devices by name for consistent ordering
    devices.sort((a, b) => a.name.localeCompare(b.name));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Found ${devices.length} devices in group ${thingGroupName}`,
        devices: devices,
        thingGroup: thingGroupName,
        totalCount: devices.length,
      }),
    };
  } catch (error) {
    console.error("Error fetching devices:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to fetch devices",
        details: error instanceof Error ? error.message : String(error),
        thingGroup: thingGroupName,
      }),
    };
  }
};
