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
  user: AuthUser | null;
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
export function isValidAuthUser(user: unknown): user is AuthUser {
  return Boolean(
    user &&
      typeof user === "object" &&
      user !== null &&
      "username" in user &&
      "email" in user &&
      "userId" in user &&
      typeof (user as AuthUser).username === "string" &&
      typeof (user as AuthUser).email === "string" &&
      typeof (user as AuthUser).userId === "string"
  );
}

export function isValidJWTPayload(payload: unknown): payload is JWTPayload {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      payload !== null &&
      "sub" in payload &&
      "email" in payload &&
      "exp" in payload &&
      "iss" in payload &&
      "aud" in payload &&
      typeof (payload as JWTPayload).sub === "string" &&
      typeof (payload as JWTPayload).email === "string" &&
      typeof (payload as JWTPayload).exp === "number" &&
      typeof (payload as JWTPayload).iss === "string" &&
      typeof (payload as JWTPayload).aud === "string"
  );
}
