import amplifyOutputs from "../../amplify_outputs.json";
import type { AmplifyAuthConfig } from "@/types/userAuth";

/**
 * Extract authentication configuration from Amplify outputs
 */
export function getAuthConfig(): AmplifyAuthConfig {
  const { auth } = amplifyOutputs;

  return {
    userPoolId: auth.user_pool_id,
    userPoolClientId: auth.user_pool_client_id,
    region: auth.aws_region,
    identityPoolId: auth.identity_pool_id,
  };
}

/**
 * Get the expected JWT issuer URL from Amplify configuration
 */
export function getExpectedIssuer(): string {
  const config = getAuthConfig();
  return `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`;
}

/**
 * Get the expected JWT audience (client ID) from Amplify configuration
 */
export function getExpectedAudience(): string {
  const config = getAuthConfig();
  return config.userPoolClientId;
}

/**
 * Get the Cognito JWKS endpoint URL from Amplify configuration
 */
export function getCognitoJWKSUrl(): string {
  const config = getAuthConfig();
  return `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}/.well-known/jwks.json`;
}

/**
 * Get all authentication URLs and identifiers
 */
export function getAuthEndpoints() {
  return {
    issuer: getExpectedIssuer(),
    audience: getExpectedAudience(),
    jwksUrl: getCognitoJWKSUrl(),
    config: getAuthConfig(),
  };
}
