import { STSClient } from "@aws-sdk/client-sts";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { IoTClient } from "@aws-sdk/client-iot";
import { fetchAuthSession } from "aws-amplify/auth/server";

// Cache for AWS region to avoid multiple STS calls
let cachedRegion: string | null = null;
let regionPromise: Promise<string> | null = null;

// Cache for IoT endpoint to avoid multiple API calls
let cachedIoTEndpoint: string | null = null;
let iotEndpointPromise: Promise<string> | null = null;

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
 * Internal function to detect AWS region by calling the IoT endpoint API
 */
async function detectRegion(): Promise<string> {
  try {
    console.log("Detecting AWS region from IoT endpoint API...");

    const response = await fetch("/api/iot/endpoint", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.region) {
      throw new Error(
        data.error || "Failed to get region from IoT endpoint API"
      );
    }

    console.log(`Detected AWS region from Lambda: ${data.region}`);
    return data.region;
  } catch (error) {
    console.warn("Could not determine AWS region from API:", error);
    const fallbackRegion = "us-east-1";
    console.log(`Using fallback AWS region: ${fallbackRegion}`);
    return fallbackRegion;
  }
}

/**
 * Get AWS account information including account ID and region from API
 * @returns Promise<{accountId: string, region: string}>
 */
export async function getAWSAccountInfo(): Promise<{
  accountId: string;
  region: string;
}> {
  try {
    console.log("Getting AWS account information from IoT endpoint API...");

    const response = await fetch("/api/iot/endpoint", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.accountId || !data.region) {
      throw new Error(
        data.error || "Failed to get account information from API"
      );
    }

    return {
      accountId: data.accountId,
      region: data.region,
    };
  } catch (error) {
    console.error("Failed to get AWS account information from API:", error);
    throw error;
  }
}

/**
 * Create a pre-configured Lambda client with the correct region and credentials
 * @returns Promise<LambdaClient> - Configured Lambda client
 */
export async function createLambdaClient(): Promise<LambdaClient> {
  const region = await getAWSRegion();

  // Detect environment and configure credentials accordingly
  const isProduction = !!(
    (
      process.env.AWS_EXECUTION_ENV || // Lambda functions
      process.env.AWS_LAMBDA_FUNCTION_NAME || // Lambda functions
      process.env.AWS_ACCESS_KEY_ID || // Amplify hosting with credentials
      process.env.AMPLIFY_BRANCH
    ) // Amplify environment indicator
  );

  console.log("AWS Config environment detection:", {
    isProduction,
    region,
    hasAwsCredentials: !!process.env.AWS_ACCESS_KEY_ID,
    amplifyBranch: process.env.AMPLIFY_BRANCH,
  });

  const config: any = { region };

  if (isProduction) {
    // Production: Use provided credentials or let AWS SDK use IAM roles
    if (process.env.AWS_ACCESS_KEY_ID) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        ...(process.env.AWS_SESSION_TOKEN && {
          sessionToken: process.env.AWS_SESSION_TOKEN,
        }),
      };
      console.log("Using explicit AWS credentials");
    } else {
      console.log("Using IAM roles (no explicit credentials)");
    }
  } else {
    // Development: Use AWS CLI profile
    const { fromNodeProviderChain } = await import(
      "@aws-sdk/credential-providers"
    );
    config.credentials = fromNodeProviderChain({
      profile: process.env.DEFAULT_PROFILE,
    });
    console.log(`Using AWS CLI profile: ${process.env.DEFAULT_PROFILE}`);
  }

  return new LambdaClient(config);
}

/**
 * Create a pre-configured Lambda client using Amplify server context
 * @param contextSpec - Amplify server context specification
 * @returns Promise<LambdaClient> - Configured Lambda client with Amplify credentials
 */
export async function createLambdaClientWithAmplifyContext(
  contextSpec: any
): Promise<LambdaClient> {
  const region = await getAWSRegion();

  // Detect environment - prefer CLI profile for development
  const isProduction = !!(
    (
      process.env.AWS_EXECUTION_ENV || // Lambda functions
      process.env.AWS_LAMBDA_FUNCTION_NAME || // Lambda functions
      process.env.AWS_ACCESS_KEY_ID || // Amplify hosting with credentials
      process.env.AMPLIFY_BRANCH
    ) // Amplify environment indicator
  );

  // For development, use CLI profile instead of Cognito credentials
  if (!isProduction && process.env.DEFAULT_PROFILE) {
    console.log(
      "Development environment: Using AWS CLI profile for Lambda client"
    );
    return createLambdaClient();
  }

  // For production, try to use Amplify server context
  try {
    console.log(
      "Production environment: Using Amplify server context for Lambda client"
    );
    const session = await fetchAuthSession(contextSpec);

    if (!session.credentials) {
      throw new Error("No credentials available from Amplify session");
    }

    return new LambdaClient({
      region,
      credentials: {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
      },
    });
  } catch (error) {
    console.error(
      "Failed to create Lambda client with Amplify context:",
      error
    );
    // Fallback to the original client creation method
    console.log("Falling back to standard Lambda client creation...");
    return createLambdaClient();
  }
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
 * Get AWS IoT Core endpoint for the current account
 * Uses cached result to avoid multiple API calls
 * This function mirrors what the Lambda functions do
 * @returns Promise<string> - IoT Core endpoint (e.g., 'xxxxx-ats.iot.us-east-1.amazonaws.com')
 */
export async function getIoTCoreEndpoint(): Promise<string> {
  // Return cached endpoint if available
  if (cachedIoTEndpoint) {
    return cachedIoTEndpoint;
  }

  // Return existing promise if endpoint detection is in progress
  if (iotEndpointPromise) {
    return iotEndpointPromise;
  }

  iotEndpointPromise = detectIoTEndpoint();

  try {
    cachedIoTEndpoint = await iotEndpointPromise;
    return cachedIoTEndpoint;
  } catch (error) {
    // Reset promise on error so it can be retried
    iotEndpointPromise = null;
    throw error;
  }
}

/**
 * Internal function to detect IoT Core endpoint from API
 */
async function detectIoTEndpoint(): Promise<string> {
  try {
    console.log("Detecting IoT Core endpoint from API...");

    const response = await fetch("/api/iot/endpoint", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.endpoint) {
      throw new Error(data.error || "Failed to get IoT endpoint from API");
    }

    console.log(`IoT Core endpoint from Lambda: ${data.endpoint}`);
    return data.endpoint;
  } catch (error) {
    console.error("Failed to detect IoT Core endpoint from API:", error);
    throw new Error("Could not determine IoT Core endpoint");
  }
}

/**
 * Clear cached IoT endpoint (useful for testing or when configuration changes)
 */
export function clearIoTEndpointCache(): void {
  cachedIoTEndpoint = null;
  iotEndpointPromise = null;
  console.log("IoT endpoint cache cleared");
}

/**
 * Check if IoT endpoint is cached
 * @returns boolean - true if endpoint is already cached
 */
export function isIoTEndpointCached(): boolean {
  return cachedIoTEndpoint !== null;
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
