import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import { getAWSRegion } from "./awsConfig";

// Global IoT configuration singleton to prevent duplicate API calls
class IoTConfigManager {
  private config: any = null;
  private configPromise: Promise<any> | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getConfig(): Promise<any> {
    const now = Date.now();

    // Return cached config if valid
    if (this.config && now - this.lastFetch < this.CACHE_DURATION) {
      // console.log("Using cached IoT configuration");
      return this.config;
    }

    // Return existing promise if already fetching
    if (this.configPromise) {
      // console.log("Waiting for existing IoT config fetch");
      return this.configPromise;
    }

    // Start new fetch
    // console.log("Fetching fresh IoT configuration");
    this.configPromise = this.fetchConfig();

    try {
      this.config = await this.configPromise;
      this.lastFetch = now;
      return this.config;
    } finally {
      this.configPromise = null;
    }
  }

  private async fetchConfig(): Promise<any> {
    // Get endpoint and region from API
    const response = await fetch("/api/iot/endpoint", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.endpoint || !data.region) {
      throw new Error(data.error || "Failed to get IoT configuration from API");
    }

    // Get AWS credentials for PubSub
    const { region, credentials, identityId } = await getAWSCredentials();

    return {
      endpoint: `wss://${data.endpoint}/mqtt`,
      region: data.region,
      accountId: data.accountId,
      websocketUrl: data.websocketUrl,
      credentials, // Include credentials for PubSub
    };
  }

  clearCache(): void {
    this.config = null;
    this.lastFetch = 0;
    this.configPromise = null;
    console.log("IoT configuration cache cleared");
  }
}

// Export singleton instance
export const iotConfigManager = new IoTConfigManager();

// Cache for IoT endpoint to prevent multiple API calls
let cachedEndpoint: string | null = null;
let cacheTimestamp: number = 0;
let pendingRequest: Promise<string> | null = null; // Prevent race conditions
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

// Cache for AWS credentials to prevent multiple auth calls
let cachedCredentials: any = null;
let credentialsCacheTimestamp: number = 0;
let pendingCredentialsRequest: Promise<any> | null = null;
const CREDENTIALS_CACHE_DURATION_MS = 4 * 60 * 1000; // 4 minutes cache (shorter than typical token expiry)

/**
 * Get AWS credentials for the current authenticated user with caching
 */
async function getAWSCredentials() {
  // Check if we have valid cached credentials
  const now = Date.now();
  if (
    cachedCredentials &&
    now - credentialsCacheTimestamp < CREDENTIALS_CACHE_DURATION_MS
  ) {
    return cachedCredentials;
  }

  // If there's already a pending credentials request, wait for it
  if (pendingCredentialsRequest) {
    return await pendingCredentialsRequest;
  }

  // Create the credentials request promise
  pendingCredentialsRequest = (async () => {
    try {
      // First verify user is authenticated
      const currentUser = await getCurrentUser();

      // Get auth session with proper error handling and retries
      let session;
      let retries = 3;

      while (retries > 0) {
        try {
          // Try to get session - force refresh on first attempt if cookies exist but session fails
          session = await fetchAuthSession({
            forceRefresh: retries === 3, // Force refresh on first attempt
          });

          // Check if we have valid credentials
          if (
            session?.credentials?.accessKeyId &&
            session?.credentials?.secretAccessKey &&
            session?.credentials?.sessionToken
          ) {
            break;
          } else {
            console.warn("Incomplete credentials, retrying...");
          }
        } catch (error) {
          console.error(
            `Auth session fetch failed (retry ${4 - retries}):`,
            error
          );

          // If it's an identity pool error, be more specific
          if (error instanceof Error) {
            if (error.message.includes("Invalid identity pool")) {
              throw new Error(
                "Identity Pool configuration error. Check IAM roles and permissions."
              );
            } else if (error.message.includes("Access denied")) {
              throw new Error(
                "Access denied - check IoT policy attachment to Cognito Identity ID"
              );
            }
          }
        }

        retries--;
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      if (
        !session?.credentials?.accessKeyId ||
        !session?.credentials?.secretAccessKey ||
        !session?.credentials?.sessionToken
      ) {
        console.error("Failed to get complete credentials after all retries");

        // Try one final attempt with force refresh and clear cache
        try {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("aws-amplify-cache");
            localStorage.removeItem("aws-amplify-cache");
          }

          session = await fetchAuthSession({ forceRefresh: true });

          if (
            !session?.credentials?.accessKeyId ||
            !session?.credentials?.secretAccessKey ||
            !session?.credentials?.sessionToken
          ) {
            throw new Error(
              "Could not obtain valid AWS credentials from Identity Pool"
            );
          }
        } catch (finalError) {
          console.error("Final credential attempt failed:", finalError);
          throw new Error(
            "Could not obtain valid AWS credentials from Identity Pool"
          );
        }
      }

      // Get region dynamically
      const region = await getAWSRegion();

      const credentials = {
        credentials: session.credentials,
        identityId: session.identityId,
        region,
      };

      // Cache the successful result
      cachedCredentials = credentials;
      credentialsCacheTimestamp = now;

      console.log("✅ AWS credentials cached successfully");
      return credentials;
    } catch (error) {
      console.error("Failed to get AWS credentials:", error);

      // More specific error messages
      if (error instanceof Error) {
        if (error.message.includes("not authenticated")) {
          throw new Error("User is not authenticated. Please sign in first.");
        } else if (error.message.includes("Invalid identity pool")) {
          throw new Error(
            "Identity Pool configuration error. Check IAM roles and permissions."
          );
        } else if (error.message.includes("Identity Pool")) {
          throw new Error(
            "Identity Pool access denied. Check user permissions."
          );
        }
      }

      throw new Error("Authentication required for IoT access");
    } finally {
      // Clear the pending request so future calls can proceed
      pendingCredentialsRequest = null;
    }
  })();

  return await pendingCredentialsRequest;
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
  console.log("IoT endpoint cache cleared");
}

/**
 * Force clear all caches and reset connection state
 */
export function clearAllIoTCache(): void {
  clearIoTEndpointCache();

  // Clear IoT config manager cache
  iotConfigManager.clearCache();

  // Clear credentials cache
  cachedCredentials = null;
  credentialsCacheTimestamp = 0;
  pendingCredentialsRequest = null;

  // Clear browser storage that might affect IoT connections
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("aws-amplify-cache");
      sessionStorage.removeItem("aws-amplify-federatedInfo");
      localStorage.removeItem("aws-amplify-cache");

      // Also clear any Cognito-related cached items
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes("CognitoIdentityServiceProvider")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      console.log("All IoT caches cleared");
    } catch (e) {
      console.warn("Could not clear some cache items:", e);
    }
  }
}

/**
 * Force refresh authentication session and clear stale credentials
 * Use this when getting "Authentication required for IoT access" errors
 */
export async function refreshAuthForIoT(): Promise<boolean> {
  try {
    console.log("Refreshing authentication for IoT...");

    // Clear all caches first
    clearAllIoTCache();

    // Wait a moment for cache clearing to take effect
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Force refresh the session
    const session = await fetchAuthSession({ forceRefresh: true });

    if (
      session?.credentials?.accessKeyId &&
      session?.credentials?.secretAccessKey &&
      session?.credentials?.sessionToken
    ) {
      return true;
    } else {
      console.error("Authentication refresh failed - missing credentials");
      return false;
    }
  } catch (error) {
    console.error("Authentication refresh failed:", error);
    return false;
  }
}

/**
 * Get IoT configuration for PubSub
 */
export async function getIoTConfig(customTopic?: string) {
  try {
    const { region, credentials, identityId } = await getAWSCredentials();
    const endpoint = await getIoTEndpoint();
    const finalTopic = customTopic; // Use ONLY the custom topic, no fallback

    // ERROR: If no custom topic provided, this is a bug
    if (!finalTopic) {
      throw new Error(
        "No topic provided to getIoTConfig - this is a bug in the topic selection system"
      );
    }

    return {
      endpoint: `wss://${endpoint}/mqtt`,
      region,
      topic: finalTopic,
      credentials, // Include credentials for PubSub
    };
  } catch (error) {
    console.error("Failed to get IoT configuration:", error);
    throw error;
  }
}

/**
 * Get the topic to subscribe to for weather data
 * This uses the configuration from iotTopics.ts or a custom topic
 */
export function getWeatherTopic(customTopic?: string): string {
  const finalTopic = customTopic; // Use ONLY the custom topic, no fallback

  // ERROR: If no custom topic provided, this is a bug
  if (!finalTopic) {
    throw new Error(
      "No topic provided to getWeatherTopic - this is a bug in the topic selection system"
    );
  }

  return finalTopic;
}
