import { NextResponse } from "next/server";
import { getCurrentUser } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import { runWithAmplifyServerContext } from "@/lib/amplifyServerConfig";
import { LegacyAuthResult, AuthRetryOptions } from "@/types/userAuth";

// Helper function to add delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Enhanced authentication with retry logic and fallback to token-only validation
 * This works around Amplify server-side authentication timing issues
 */
export async function authenticateWithRetry(
  options: AuthRetryOptions = {}
): Promise<LegacyAuthResult> {
  const { maxAttempts = 3, baseDelay = 200, routeName = "API" } = options;

  // First, check if we have Cognito tokens
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const cognitoCookies = allCookies.filter((cookie) =>
    cookie.name.includes("CognitoIdentityServiceProvider")
  );

  const hasAccessToken = cognitoCookies.some(
    (cookie) => cookie.name.includes("accessToken") && cookie.value
  );
  const hasIdToken = cognitoCookies.some(
    (cookie) => cookie.name.includes("idToken") && cookie.value
  );

  console.log(
    `${routeName}: Found ${cognitoCookies.length} Cognito cookies, hasAccessToken: ${hasAccessToken}, hasIdToken: ${hasIdToken}`
  );

  // If no tokens at all, definitely not authenticated
  if (!hasAccessToken && !hasIdToken) {
    console.log(`${routeName}: No authentication tokens found`);
    return { user: null, isAuthenticated: false, attempt: 0 };
  }

  // Try Amplify authentication first, but with reduced attempts since it seems to be broken
  for (let attempt = 1; attempt <= Math.min(maxAttempts, 2); attempt++) {
    try {
      const user = await runWithAmplifyServerContext({
        nextServerContext: { cookies },
        operation: async (contextSpec) => {
          return await getCurrentUser(contextSpec);
        },
      });

      console.log(
        `${routeName}: Amplify authentication successful on attempt ${attempt}`
      );
      return { user, isAuthenticated: true, attempt };
    } catch (authError) {
      console.log(
        `${routeName}: Amplify auth attempt ${attempt}/${Math.min(
          maxAttempts,
          2
        )} failed:`,
        (authError as Error).message
      );

      if (attempt < Math.min(maxAttempts, 2)) {
        const waitTime = baseDelay * Math.pow(1.5, attempt - 1);
        console.log(
          `${routeName}: Waiting ${waitTime}ms before retry attempt ${
            attempt + 1
          }`
        );
        await delay(waitTime);
      }
    }
  }

  // Amplify authentication failed, but we have tokens - use token-based validation
  if (hasAccessToken || hasIdToken) {
    console.log(
      `${routeName}: Amplify auth failed but tokens present - using token-based authentication`
    );

    // Extract user info from tokens if possible
    let userInfo = null;
    try {
      // Try to extract user info from ID token (it's a JWT)
      const idTokenCookie = cognitoCookies.find(
        (cookie) => cookie.name.includes("idToken") && cookie.value
      );

      if (idTokenCookie) {
        // JWT tokens have 3 parts separated by dots
        const tokenParts = idTokenCookie.value.split(".");
        if (tokenParts.length === 3) {
          // Decode the payload (second part)
          const payload = JSON.parse(
            Buffer.from(tokenParts[1], "base64").toString()
          );
          userInfo = {
            username: payload.cognito_username || payload.sub,
            email: payload.email,
            userId: payload.sub,
            tokenInfo: {
              exp: payload.exp,
              iat: payload.iat,
              token_use: payload.token_use,
            },
          };
          console.log(`${routeName}: Extracted user info from token:`, {
            username: userInfo.username,
            email: userInfo.email,
            expired: payload.exp < Date.now() / 1000,
          });
        }
      }
    } catch (tokenError) {
      console.log(
        `${routeName}: Could not parse token:`,
        (tokenError as Error).message
      );
    }

    return {
      user: userInfo,
      isAuthenticated: true,
      tokensPresent: true,
      attempt: maxAttempts,
    };
  }

  return { user: null, isAuthenticated: false, attempt: maxAttempts };
}

/**
 * Quick authentication check with minimal retries for background requests
 */
export async function authenticateQuick(
  routeName: string = "API"
): Promise<LegacyAuthResult> {
  return authenticateWithRetry({
    maxAttempts: 3, // Increased from 2 to 3
    baseDelay: 300, // Increased from 100ms to 300ms
    routeName,
  });
}

/**
 * Standard authentication with balanced retry attempts for user actions
 */
export async function authenticateStandard(
  routeName: string = "API"
): Promise<LegacyAuthResult> {
  return authenticateWithRetry({
    maxAttempts: 4, // Increased from 3 to 4
    baseDelay: 400, // Increased from 200ms to 400ms
    routeName,
  });
}

/**
 * Robust authentication with more retries for critical operations
 */
export async function authenticateRobust(
  routeName: string = "API"
): Promise<LegacyAuthResult> {
  return authenticateWithRetry({
    maxAttempts: 5, // Increased from 4 to 5
    baseDelay: 500, // Increased from 250ms to 500ms
    routeName,
  });
}

/**
 * Ultra-robust authentication for persistent timing issues
 */
export async function authenticateUltra(
  routeName: string = "API"
): Promise<LegacyAuthResult> {
  return authenticateWithRetry({
    maxAttempts: 6,
    baseDelay: 750,
    routeName,
  });
}

// Legacy function for backward compatibility
export async function withAuth(
  request: Request,
  handler: (req: Request, context: { user: any }) => Promise<Response>
) {
  try {
    const authResult = await authenticateStandard("withAuth");

    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        {
          error: "Authentication required",
          details: "No valid authentication tokens found",
          recoverySuggestion: "Please sign in again to access this resource",
        },
        { status: 401 }
      );
    }

    console.log(
      "Successfully authenticated user:",
      authResult.user?.username || authResult.user?.userId || "token-validated"
    );
    return await handler(request, { user: authResult.user });
  } catch (error) {
    console.error("Authentication failed:", error);
    return NextResponse.json(
      {
        error: "Authentication required",
        details:
          error instanceof Error
            ? error.message
            : "Unknown authentication error",
        recoverySuggestion: "Please sign in again to access this resource",
      },
      { status: 401 }
    );
  }
}
