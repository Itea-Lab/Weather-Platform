import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { IoTClient } from "@aws-sdk/client-iot";

// Cache for AWS region to avoid multiple STS calls
let cachedRegion: string | null = null;
let regionPromise: Promise<string> | null = null;

/**
 * Get current AWS region using STS client configuration
 * Results are cached to avoid multiple STS calls
 * @returns Promise<string> - AWS region (e.g., 'us-east-1')
 */
export async function getAWSRegion(): Promise<string> {
  // Return cached region if available
  if (cachedRegion) {
    return cachedRegion;
  }

  // Return existing promise if region detection is in progress
  if (regionPromise) {
    return regionPromise;
  }

  // Start region detection
  regionPromise = detectRegion();

  try {
    cachedRegion = await regionPromise;
    return cachedRegion;
  } catch (error) {
    // Reset promise on error so it can be retried
    regionPromise = null;
    throw error;
  }
}

/**
 * Internal function to detect AWS region
 */
async function detectRegion(): Promise<string> {
  try {
    // First try environment variable (works in Lambda and local with proper setup)
    const envRegion = process.env.AWS_REGION;
    if (envRegion) {
      console.log(`Using AWS region from environment: ${envRegion}`);
      return envRegion;
    }

    // For local development, use STS client to determine region
    console.log("Detecting AWS region using STS client configuration...");
    const stsClient = new STSClient({}); // Uses default region resolution

    // Attempt to call STS to verify connectivity and get account info
    await stsClient.send(new GetCallerIdentityCommand({}));

    // Get the region from the STS client configuration
    const clientConfig = stsClient.config;
    const region = await clientConfig.region();

    if (typeof region === "string") {
      console.log(`Detected AWS region: ${region}`);
      return region;
    }

    throw new Error("Could not determine region from STS client configuration");
  } catch (error) {
    console.warn("Could not determine AWS region dynamically:", error);
    const fallbackRegion = "us-east-1";
    console.log(`Using fallback AWS region: ${fallbackRegion}`);
    return fallbackRegion;
  }
}

/**
 * Get AWS account information including account ID and region
 * Uses cached region if available
 * @returns Promise<{accountId: string, region: string}>
 */
export async function getAWSAccountInfo(): Promise<{
  accountId: string;
  region: string;
}> {
  try {
    const region = await getAWSRegion();

    // Create STS client with the detected region
    const stsClient = new STSClient({ region });
    const callerIdentity = await stsClient.send(
      new GetCallerIdentityCommand({})
    );

    if (!callerIdentity.Account) {
      throw new Error("Could not determine AWS account ID");
    }

    return {
      accountId: callerIdentity.Account,
      region: region,
    };
  } catch (error) {
    console.error("Failed to get AWS account information:", error);
    throw error;
  }
}

/**
 * Create a pre-configured Lambda client with the correct region
 * @returns Promise<LambdaClient> - Configured Lambda client
 */
export async function createLambdaClient(): Promise<LambdaClient> {
  const region = await getAWSRegion();
  return new LambdaClient({ region });
}

/**
 * Create a pre-configured IoT client with the correct region
 * @returns Promise<IoTClient> - Configured IoT client
 */
export async function createIoTClient(): Promise<IoTClient> {
  const region = await getAWSRegion();
  return new IoTClient({ region });
}

/**
 * Create a pre-configured STS client with the correct region
 * @returns Promise<STSClient> - Configured STS client
 */
export async function createSTSClient(): Promise<STSClient> {
  const region = await getAWSRegion();
  return new STSClient({ region });
}

/**
 * Clear cached region (useful for testing or when credentials change)
 */
export function clearRegionCache(): void {
  cachedRegion = null;
  regionPromise = null;
  console.log("AWS region cache cleared");
}

/**
 * Check if region is cached
 * @returns boolean - true if region is already cached
 */
export function isRegionCached(): boolean {
  return cachedRegion !== null;
}
