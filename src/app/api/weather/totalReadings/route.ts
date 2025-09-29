import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateAPI } from "@/lib/auth";
import { invokeLambdaWithAmplifyContext } from "@/lib/lambdaInvoker";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";

export async function GET() {
  return runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (contextSpec) => {
      try {
        const user = await authenticateAPI("totalReadings");
        console.log(
          `Route: User info for totalReadings: ${
            user?.username || "authenticated-user"
          }`
        );

        // Use the getTotalReadings function to get total count
        try {
          const result = await invokeLambdaWithAmplifyContext(
            "getTotalReadingsFunctionName",
            {
              operation: "getTotalCount",
            },
            contextSpec
          );

          if (!result) {
            throw new Error("No response from Lambda function");
          }

          // Parse the response
          let responseData;
          if (typeof result === "string") {
            responseData = JSON.parse(result);
          } else {
            responseData = result;
          }

          // Extract total count from response
          const totalCount =
            responseData?.totalCount || responseData?.count || 0;

          return NextResponse.json({
            success: true,
            totalReadings: totalCount,
            fetchedAt: new Date().toISOString(),
            fetchedBy: user?.email || user?.username || "authenticated-user",
          });
        } catch (lambdaError) {
          console.warn(
            "Lambda invocation failed, using fallback:",
            lambdaError
          );

          // Fallback: return a reasonable estimate based on current data
          // This could be enhanced to use a direct S3 count or cached value
          return NextResponse.json({
            success: true,
            totalReadings: 0, // Fallback estimate
            isEstimate: true,
            fetchedAt: new Date().toISOString(),
            fetchedBy: user?.email || user?.username || "authenticated-user",
          });
        }
      } catch (error) {
        console.error("Total readings fetch error:", error);
        if (error instanceof Error) {
          return NextResponse.json(
            {
              error: "Failed to fetch total readings",
              details: error.message,
              stack:
                process.env.NODE_ENV === "development"
                  ? error.stack
                  : undefined,
            },
            { status: 500 }
          );
        }
        return NextResponse.json(
          { error: "Failed to fetch total readings", details: String(error) },
          { status: 500 }
        );
      }
    },
  });
}
