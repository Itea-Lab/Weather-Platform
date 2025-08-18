import { fetchAuthSession } from "aws-amplify/auth";
import { getActiveWeatherTopic } from "@/config/iotTopics";

// Cache for IoT endpoint to prevent multiple API calls
let cachedEndpoint: string | null = null;
let cacheTimestamp: number = 0;
let pendingRequest: Promise<string> | null = null; // Prevent race conditions
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

/**
 * Get AWS credentials for the current authenticated user
 */
async function getAWSCredentials() {
  try {
    const session = await fetchAuthSession();

    if (!session.credentials) {
      throw new Error("No AWS credentials found");
    }

    return {
      credentials: session.credentials,
      region: "us-east-1", // Use the region from amplify_outputs.json
    };
  } catch (error) {
    console.error("❌ Failed to get AWS credentials:", error);
    throw new Error("Authentication required for IoT access");
  }
}

/**
 * Get the IoT Core endpoint via API route with caching and race condition prevention
 * Client-side should always call the API endpoint, not Lambda directly
 */
export async function getIoTEndpoint(): Promise<string> {
  // Check if we have a valid cached endpoint
  const now = Date.now();
  if (cachedEndpoint && now - cacheTimestamp < CACHE_DURATION_MS) {
    // Reduced logging: only show cached usage occasionally
    return cachedEndpoint;
  }

  // If there's already a pending request, wait for it instead of making a new one
  if (pendingRequest) {
    return await pendingRequest;
  }

  // Create the request promise
  pendingRequest = (async () => {
    try {
      // Client-side should call the API endpoint (which handles Lambda fallback internally)
      const apiResponse = await fetch("/api/iot/endpoint", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!apiResponse.ok) {
        throw new Error(`API request failed with status ${apiResponse.status}`);
      }

      const data = await apiResponse.json();

      if (!data.success || !data.endpoint) {
        throw new Error(data.error || "API returned unsuccessful response");
      }

      // Cache the successful result
      cachedEndpoint = data.endpoint;
      cacheTimestamp = now;

      // Only log the first successful fetch
      console.log("IoT Core endpoint cached");
      return data.endpoint;
    } catch (error) {
      console.error("❌ Failed to get IoT Core endpoint from API:", error);

      // Client-side should not try Lambda directly - API route handles that
      throw new Error(
        "Could not retrieve IoT endpoint from API. Please check your AWS configuration and ensure the backend is properly deployed."
      );
    } finally {
      // Clear the pending request so future calls can proceed
      pendingRequest = null;
    }
  })();

  return await pendingRequest;
}

/**
 * Clear the cached IoT endpoint (useful for testing or if endpoint changes)
 */
export function clearIoTEndpointCache(): void {
  cachedEndpoint = null;
  cacheTimestamp = 0;
  pendingRequest = null; // Also clear any pending requests
}

/**
 * Get IoT configuration for PubSub
 */
export async function getIoTConfig() {
  try {
    const { region } = await getAWSCredentials();
    const endpoint = await getIoTEndpoint();

    return {
      endpoint: `wss://${endpoint}/mqtt`,
      region,
      topic: getActiveWeatherTopic(), // Use configurable topic
    };
  } catch (error) {
    console.error("❌ Failed to get IoT configuration:", error);
    throw error;
  }
}

/**
 * Get the topic to subscribe to for weather data
 * This uses the configuration from iotTopics.ts
 */
export function getWeatherTopic(): string {
  return getActiveWeatherTopic();
}
