import type { Handler } from "aws-lambda";
import {
  IoTClient,
  DeleteThingCommand,
  RemoveThingFromThingGroupCommand,
  DetachPolicyCommand,
  DetachThingPrincipalCommand,
  ListThingPrincipalsCommand,
  DeleteCertificateCommand,
  UpdateCertificateCommand,
} from "@aws-sdk/client-iot";

export const handler: Handler = async (event) => {
  const region = process.env.AWS_REGION!;

  // Initialize AWS clients
  const iot = new IoTClient({ region });

  const thingName = event.thingName;
  const thingGroupName = process.env.AWS_IOT_THING_GROUP_NAME;
  const policyName = process.env.AWS_IOT_POLICY_NAME;

  try {
    // Validate inputs
    if (!thingName) {
      throw new Error("thingName is required");
    }

    if (!thingGroupName || !policyName) {
      throw new Error(
        "AWS_IOT_THING_GROUP_NAME and AWS_IOT_POLICY_NAME must be defined"
      );
    }

    console.log(`Starting deletion process for device: ${thingName}`);

    // Step 1: Get all certificates attached to the thing
    const principalsResponse = await iot.send(
      new ListThingPrincipalsCommand({
        thingName,
      })
    );

    const principals = principalsResponse.principals || [];
    console.log(
      `Found ${principals.length} principals attached to ${thingName}`
    );

    // Step 2: Remove thing from thing group
    try {
      await iot.send(
        new RemoveThingFromThingGroupCommand({
          thingName,
          thingGroupName,
        })
      );
      console.log(`Removed ${thingName} from thing group ${thingGroupName}`);
    } catch (error) {
      console.warn(
        `Failed to remove from thing group (may not be in group):`,
        error
      );
      // Continue with deletion even if not in group
    }

    // Step 3: For each certificate, detach policies and thing, then delete certificate
    for (const principal of principals) {
      console.log(`Processing principal: ${principal}`);

      try {
        // Detach policy from certificate
        await iot.send(
          new DetachPolicyCommand({
            policyName,
            target: principal,
          })
        );
        console.log(`Detached policy ${policyName} from ${principal}`);
      } catch (error) {
        console.warn(`Failed to detach policy from ${principal}:`, error);
        // Continue even if policy detachment fails
      }

      try {
        // Detach thing from certificate
        await iot.send(
          new DetachThingPrincipalCommand({
            thingName,
            principal,
          })
        );
        console.log(`Detached thing ${thingName} from principal ${principal}`);
      } catch (error) {
        console.warn(`Failed to detach thing from ${principal}:`, error);
        // Continue even if thing detachment fails
      }

      // Extract certificate ID from ARN for deletion
      const certificateId = principal.split("/").pop();
      if (certificateId) {
        try {
          // First, make certificate inactive
          await iot.send(
            new UpdateCertificateCommand({
              certificateId,
              newStatus: "INACTIVE",
            })
          );
          console.log(`Set certificate ${certificateId} to INACTIVE`);

          // Then delete the certificate
          await iot.send(
            new DeleteCertificateCommand({
              certificateId,
              forceDelete: true, // Force delete even if attached to other resources
            })
          );
          console.log(`Deleted certificate ${certificateId}`);
        } catch (error) {
          console.warn(`Failed to delete certificate ${certificateId}:`, error);
          // Continue even if certificate deletion fails
        }
      }
    }

    // Step 4: Finally, delete the IoT Thing itself
    await iot.send(
      new DeleteThingCommand({
        thingName,
      })
    );
    console.log(`Deleted IoT Thing ${thingName}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Device ${thingName} deleted successfully`,
        thingName,
        thingGroup: thingGroupName,
        deletedComponents: {
          thing: true,
          certificates: principals.length,
          thingGroupRemoval: true,
          policyDetachment: true,
        },
        deletedAt: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("Error deleting device:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to delete device",
        details: error instanceof Error ? error.message : String(error),
        thingName: thingName,
      }),
    };
  }
};
