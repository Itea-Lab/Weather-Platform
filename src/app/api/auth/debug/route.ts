import { NextResponse } from "next/server";
import { getCurrentUser } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import { runWithAmplifyServerContext } from "@/lib/amplifyServerConfig";

// Helper function to add delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    attempts: [],
    cookies: {},
    environment: {},
    conclusion: "",
  };

  try {
    // 1. Check Environment Variables
    diagnostics.environment = {
      hasAmplifyAppId: !!process.env.AMPLIFY_APP_ID,
      hasAmplifyUserPoolId: !!process.env.AMPLIFY_AUTH_USER_POOL_ID,
      hasAmplifyUserPoolClientId:
        !!process.env.AMPLIFY_AUTH_USER_POOL_CLIENT_ID,
      hasAmplifyIdentityPoolId: !!process.env.AMPLIFY_AUTH_IDENTITY_POOL_ID,
      nodeEnv: process.env.NODE_ENV,
      amplifyBranch: process.env.AMPLIFY_BRANCH || "not-set",
    };

    // 2. Analyze Cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    diagnostics.cookies = {
      totalCookies: allCookies.length,
      cognitoCookies: allCookies
        .filter((cookie) =>
          cookie.name.includes("CognitoIdentityServiceProvider")
        )
        .map((cookie) => ({
          name: cookie.name,
          hasValue: !!cookie.value,
          valueLength: cookie.value?.length || 0,
          isAccessToken: cookie.name.includes("accessToken"),
          isIdToken: cookie.name.includes("idToken"),
          isRefreshToken: cookie.name.includes("refreshToken"),
        })),
      hasCognitoTokens: allCookies.some(
        (cookie) =>
          cookie.name.includes("CognitoIdentityServiceProvider") &&
          (cookie.name.includes("accessToken") ||
            cookie.name.includes("idToken"))
      ),
    };

    // 3. Test Authentication with Different Delays
    const testDelays = [0, 500, 1000, 2000, 5000]; // 0ms, 500ms, 1s, 2s, 5s

    for (let i = 0; i < testDelays.length; i++) {
      const delayMs = testDelays[i];
      const attemptStart = Date.now();

      if (delayMs > 0) {
        console.log(`Auth Debug: Waiting ${delayMs}ms before attempt ${i + 1}`);
        await delay(delayMs);
      }

      try {
        const user = await runWithAmplifyServerContext({
          nextServerContext: { cookies },
          operation: async (contextSpec) => {
            return await getCurrentUser(contextSpec);
          },
        });

        const attemptEnd = Date.now();
        const attemptData = {
          attempt: i + 1,
          delayBeforeAttempt: delayMs,
          duration: attemptEnd - attemptStart,
          success: true,
          user: {
            username: (user as any)?.username,
            userId: (user as any)?.userId,
            email:
              (user as any)?.signInDetails?.loginId ||
              (user as any)?.attributes?.email,
            hasSignInDetails: !!(user as any)?.signInDetails,
            hasAttributes: !!(user as any)?.attributes,
          },
          error: null,
        };

        diagnostics.attempts.push(attemptData);
        console.log(
          `Auth Debug: SUCCESS on attempt ${i + 1} after ${delayMs}ms delay`
        );

        // Success! No need to continue
        diagnostics.conclusion = `Authentication succeeded on attempt ${
          i + 1
        } after ${delayMs}ms delay`;
        break;
      } catch (authError) {
        const attemptEnd = Date.now();
        const attemptData = {
          attempt: i + 1,
          delayBeforeAttempt: delayMs,
          duration: attemptEnd - attemptStart,
          success: false,
          user: null,
          error: {
            name: (authError as Error).name,
            message: (authError as Error).message,
            stack:
              process.env.NODE_ENV === "development"
                ? (authError as Error).stack
                : "hidden",
          },
        };

        diagnostics.attempts.push(attemptData);
        console.log(
          `Auth Debug: FAILED on attempt ${i + 1} after ${delayMs}ms delay:`,
          (authError as Error).message
        );

        // If this is the last attempt, set conclusion
        if (i === testDelays.length - 1) {
          diagnostics.conclusion = `All ${testDelays.length} attempts failed. Authentication may be fundamentally broken or require more than 5 seconds.`;
        }
      }
    }

    // 4. Additional Analysis
    diagnostics.analysis = {
      allAttemptsFailed: diagnostics.attempts.every(
        (attempt: any) => !attempt.success
      ),
      successfulAttempts: diagnostics.attempts.filter(
        (attempt: any) => attempt.success
      ),
      averageFailureDuration:
        diagnostics.attempts
          .filter((attempt: any) => !attempt.success)
          .reduce((sum: number, attempt: any) => sum + attempt.duration, 0) /
        Math.max(
          1,
          diagnostics.attempts.filter((attempt: any) => !attempt.success).length
        ),
      recommendation: "",
    };

    // Generate recommendation
    if (diagnostics.analysis.allAttemptsFailed) {
      if (!diagnostics.cookies.hasCognitoTokens) {
        diagnostics.analysis.recommendation =
          "No Cognito tokens found. User may not be logged in on the client side.";
      } else if (!diagnostics.environment.hasAmplifyUserPoolId) {
        diagnostics.analysis.recommendation =
          "Missing Amplify environment variables. Check amplify_outputs.json and environment setup.";
      } else {
        diagnostics.analysis.recommendation =
          "Cognito tokens exist but authentication always fails. This suggests a configuration issue with Amplify server-side context or cookie parsing.";
      }
    } else {
      const successfulAttempt = diagnostics.analysis.successfulAttempts[0];
      diagnostics.analysis.recommendation = `Authentication works but requires ${successfulAttempt.delayBeforeAttempt}ms delay. Consider using this delay in production.`;
    }

    return NextResponse.json(diagnostics, { status: 200 });
  } catch (error) {
    diagnostics.fatalError = {
      message: (error as Error).message,
      stack:
        process.env.NODE_ENV === "development"
          ? (error as Error).stack
          : "hidden",
    };

    diagnostics.conclusion = "Fatal error during diagnostics";

    return NextResponse.json(diagnostics, { status: 500 });
  }
}
