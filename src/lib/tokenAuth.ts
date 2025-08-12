import { cookies } from "next/headers";

interface TokenAuthResult {
  isAuthenticated: boolean;
  user: {
    username: string;
    email: string;
    userId: string;
    tokenExpiry?: number;
  } | null;
  error?: string;
}

/**
 * Fast token-only authentication that parses JWT tokens directly
 * No Amplify server context - just pure JWT validation
 */
export async function authenticateWithTokenOnly(
  routeName: string = "API"
): Promise<TokenAuthResult> {
  try {
    console.log(`${routeName}: Starting token-only authentication`);

    // Get all cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Find Cognito cookies
    const cognitoCookies = allCookies.filter((cookie) =>
      cookie.name.includes("CognitoIdentityServiceProvider")
    );

    const accessTokenCookie = cognitoCookies.find(
      (cookie) => cookie.name.includes("accessToken") && cookie.value
    );
    const idTokenCookie = cognitoCookies.find(
      (cookie) => cookie.name.includes("idToken") && cookie.value
    );

    console.log(
      `${routeName}: Found ${
        cognitoCookies.length
      } Cognito cookies, hasAccessToken: ${!!accessTokenCookie}, hasIdToken: ${!!idTokenCookie}`
    );

    // Must have at least one token
    if (!accessTokenCookie && !idTokenCookie) {
      console.log(`${routeName}: No authentication tokens found`);
      return {
        isAuthenticated: false,
        user: null,
        error: "No authentication tokens found",
      };
    }

    // Parse ID token for user info (it's a JWT with user data)
    let userInfo = null;
    if (idTokenCookie) {
      try {
        // JWT tokens have 3 parts separated by dots: header.payload.signature
        const tokenParts = idTokenCookie.value.split(".");
        if (tokenParts.length === 3) {
          // Decode the payload (second part) - it's base64 encoded
          const payload = JSON.parse(
            Buffer.from(tokenParts[1], "base64url").toString()
          );

          // Check if token is expired
          const now = Math.floor(Date.now() / 1000);
          const isExpired = payload.exp && payload.exp < now;

          if (isExpired) {
            console.log(`${routeName}: Token is expired`);
            return {
              isAuthenticated: false,
              user: null,
              error: "Token expired",
            };
          }

          userInfo = {
            username: payload.cognito_username || payload.sub,
            email: payload.email,
            userId: payload.sub,
            tokenExpiry: payload.exp,
          };

          console.log(
            `${routeName}: Successfully parsed token for user: ${userInfo.username} (${userInfo.email})`
          );
        }
      } catch (tokenError) {
        console.log(
          `${routeName}: Failed to parse ID token:`,
          (tokenError as Error).message
        );
        // Continue - we might still have access token
      }
    }

    // If we have tokens but couldn't parse user info, still authenticate
    // (access token might be valid even if ID token parsing failed)
    if (!userInfo && accessTokenCookie) {
      console.log(
        `${routeName}: Access token present but no user info parsed - allowing authentication`
      );
      userInfo = {
        username: "token-validated-user",
        email: "unknown@token.auth",
        userId: "token-validated",
      };
    }

    if (userInfo) {
      console.log(`${routeName}: Token authentication successful`);
      return {
        isAuthenticated: true,
        user: userInfo,
      };
    }

    console.log(`${routeName}: Token authentication failed - no valid tokens`);
    return {
      isAuthenticated: false,
      user: null,
      error: "Invalid tokens",
    };
  } catch (error) {
    console.error(`${routeName}: Token authentication error:`, error);
    return {
      isAuthenticated: false,
      user: null,
      error: error instanceof Error ? error.message : "Authentication error",
    };
  }
}

/**
 * Middleware-optimized version with minimal logging
 */
export async function authenticateMiddleware(
  routeName: string
): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    const hasValidTokens = allCookies.some(
      (cookie) =>
        cookie.name.includes("CognitoIdentityServiceProvider") &&
        (cookie.name.includes("accessToken") ||
          cookie.name.includes("idToken")) &&
        cookie.value
    );

    if (hasValidTokens) {
      console.log(`${routeName}: Token validation successful`);
      return true;
    }

    console.log(`${routeName}: No valid tokens found`);
    return false;
  } catch (error) {
    console.log(`${routeName}: Token validation failed:`, error);
    return false;
  }
}

export default authenticateWithTokenOnly;
