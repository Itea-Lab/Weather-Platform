export interface AuthResult {
  isAuthenticated: boolean;
  user: AuthUser | null;
  error?: string;
  securityLevel?: "Full" | "Structure" | "Fallback";
}

export interface AuthUser {
  username: string;
  email: string;
  userId: string;
  tokenExpiry?: number;
}

export interface AuthRetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  routeName?: string;
}

export interface LegacyAuthResult {
  user: any | null;
  isAuthenticated: boolean;
  attempt: number;
  tokensPresent?: boolean;
}

export interface JWTHeader {
  alg: string;
  kid: string;
  typ?: string;
}

export interface JWTPayload {
  sub: string;
  cognito_username?: string;
  email: string;
  email_verified?: boolean;
  exp: number;
  iat: number;
  iss: string;
  aud: string;
  token_use?: string;
  auth_time?: number;
}

export interface ParsedJWT {
  header: JWTHeader;
  payload: JWTPayload;
}

export interface AmplifyAuthConfig {
  userPoolId: string;
  userPoolClientId: string;
  region: string;
  identityPoolId?: string;
}

// Type guard functions
export function isValidAuthUser(user: any): user is AuthUser {
  return (
    user &&
    typeof user.username === "string" &&
    typeof user.email === "string" &&
    typeof user.userId === "string"
  );
}

export function isValidJWTPayload(payload: any): payload is JWTPayload {
  return (
    payload &&
    typeof payload.sub === "string" &&
    typeof payload.email === "string" &&
    typeof payload.exp === "number" &&
    typeof payload.iss === "string" &&
    typeof payload.aud === "string"
  );
}
