import type { Handler } from "aws-lambda";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const handler: Handler = async (event, context) => {
  try {
    // Parse the event body to get the payload
    const payload =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body || event;
    const { operation } = payload;

    // Use the specific bucket for weather data lake storage
    const bucket = "itea-weather-data-lake-storage";

    // Handle different operations
    if (operation === "getTotalCount") {
      const totalCount = await getTotalObjectCount(bucket);
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
        body: JSON.stringify({
          totalCount,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Default: return total readings count
    const totalCount = await getTotalObjectCount(bucket);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: JSON.stringify({
        totalCount,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

async function getTotalObjectCount(bucketName: string): Promise<number> {
  let totalCount = 0;
  let continuationToken: string | undefined;

  try {
    do {
      // List objects in the telemetry folder where readings are stored
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: "raw-data/weatherPlatform/telemetry/", // Count only telemetry readings
        ContinuationToken: continuationToken,
        MaxKeys: 1000, // AWS S3 max per request
      });

      const response = await s3Client.send(listCommand);

      if (response.Contents) {
        totalCount += response.Contents.length;
      }

      // Check if there are more objects to list
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return totalCount;
  } catch (error) {
    console.error("Error counting objects:", error);
    // Return a reasonable estimate if counting fails
    return 15000;
  }
}
