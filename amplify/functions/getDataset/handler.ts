import type { Handler } from "aws-lambda";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

interface DatasetInfo {
  latest_update: string;
  url: string;
}

interface DatasetResponse {
  datasets: Record<string, DatasetInfo>;
}

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const handler: Handler = async (event, context) => {
  try {
    // Parse the event body to get the payload
    const payload =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body || event;
    const { district, bucketName, cloudFrontDomain } = payload;

    // Use values from the payload if environment variables are not available
    const bucket = process.env.STORAGE_BUCKET_NAME || bucketName;
    const cdnDomain = process.env.CLOUDFRONT_DOMAIN || cloudFrontDomain;

    if (!bucket || !cdnDomain) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
        body: JSON.stringify({
          error: "Missing required parameters: bucketName or cloudFrontDomain",
        }),
      };
    }

    // If district is specified, return specific district data
    if (district) {
      const districtData = await getDistrictDataset(
        bucket,
        cdnDomain,
        district
      );
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
        body: JSON.stringify(districtData),
      };
    }

    // List all datasets by district
    const datasets = await listAllDatasets(bucket, cdnDomain);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: JSON.stringify({ datasets }),
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

async function listAllDatasets(
  bucketName: string,
  cloudFrontDomain: string
): Promise<Record<string, DatasetInfo>> {
  const datasets: Record<string, DatasetInfo> = {};

  try {
    // List all objects under the dataset/ prefix
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: "dataset/",
      Delimiter: "/",
    });

    const response = await s3Client.send(listCommand);

    if (response.CommonPrefixes) {
      // Process each district folder
      for (const prefix of response.CommonPrefixes) {
        if (prefix.Prefix) {
          const district = prefix.Prefix.replace("dataset/", "").replace(
            "/",
            ""
          );
          const districtData = await getDistrictDataset(
            bucketName,
            cloudFrontDomain,
            district
          );
          if (districtData.latest_update && districtData.url) {
            datasets[district] = districtData;
          }
        }
      }
    }

    return datasets;
  } catch (error) {
    console.error("Error listing datasets:", error);
    throw new Error(
      `Failed to list datasets: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function getDistrictDataset(
  bucketName: string,
  cloudFrontDomain: string,
  district: string
): Promise<DatasetInfo> {
  try {
    // List objects in the specific district folder
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: `dataset/${district}/`,
      Delimiter: "/",
    });

    const response = await s3Client.send(listCommand);

    if (!response.CommonPrefixes || response.CommonPrefixes.length === 0) {
      return { latest_update: "", url: "" };
    }

    // Find the latest dataset folder based on timestamp
    let latestFolder = "";
    let latestTimestamp = "";

    for (const prefix of response.CommonPrefixes) {
      if (prefix.Prefix) {
        const folderName = prefix.Prefix.split("/").slice(-2, -1)[0]; // Get folder name

        // Extract timestamp from folder name (all_data_20250903_052637.csv)
        const timestampMatch = folderName.match(/all_data_(\d{8}_\d{6})\.csv/);
        if (timestampMatch) {
          const timestamp = timestampMatch[1];
          if (timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
            latestFolder = prefix.Prefix;
          }
        }
      }
    }

    if (!latestFolder) {
      return { latest_update: "", url: "" };
    }

    // Get the actual CSV file inside the latest folder
    const fileListCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: latestFolder,
    });

    const fileResponse = await s3Client.send(fileListCommand);

    if (!fileResponse.Contents || fileResponse.Contents.length === 0) {
      return { latest_update: "", url: "" };
    }

    // Find the CSV file (should be part-*.csv)
    const csvFile = fileResponse.Contents.find(
      (obj) => obj.Key && obj.Key.endsWith(".csv") && obj.Key.includes("part-")
    );

    if (!csvFile || !csvFile.Key) {
      return { latest_update: "", url: "" };
    }

    // Format the timestamp for display (20250903_052637 -> 2025-09-03 05:26:37)
    const formattedDate = formatTimestamp(latestTimestamp);

    // Create CloudFront URL
    const cloudFrontUrl = `https://${cloudFrontDomain}/${csvFile.Key}`;

    return {
      latest_update: formattedDate,
      url: cloudFrontUrl,
    };
  } catch (error) {
    console.error(`Error getting dataset for district ${district}:`, error);
    return { latest_update: "", url: "" };
  }
}

function formatTimestamp(timestamp: string): string {
  // Convert 20250903_052637 to 2025-09-03 05:26:37
  if (timestamp.length !== 15) return timestamp; // Invalid format

  const date = timestamp.substring(0, 8); // 20250903
  const time = timestamp.substring(9, 15); // 052637

  const year = date.substring(0, 4);
  const month = date.substring(4, 6);
  const day = date.substring(6, 8);

  const hour = time.substring(0, 2);
  const minute = time.substring(2, 4);
  const second = time.substring(4, 6);

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}
