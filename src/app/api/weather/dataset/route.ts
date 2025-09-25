import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { invokeLambdaWithAmplifyContext } from "@/lib/lambdaInvoker";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";
import outputs from "../../../../../amplify_outputs.json";

export async function GET(request: NextRequest) {
  return runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (contextSpec) => {
      try {
        // Check if the getDataset Lambda function is available
        const amplifyOutputs = await import(
          "../../../../../amplify_outputs.json"
        );
        const customOutputs = (
          amplifyOutputs as { custom?: { getDatasetFunctionName?: string } }
        ).custom;

        if (!customOutputs?.getDatasetFunctionName) {
          // Return error when Lambda function is not deployed - don't return mock data
          console.error(
            "getDataset Lambda function not found in amplify outputs"
          );
          return NextResponse.json(
            {
              error: "Dataset service unavailable",
              message: "Dataset Lambda function is not deployed or configured",
              datasets: {},
            },
            { status: 503 }
          );
        }

        const { searchParams } = new URL(request.url);
        const district = searchParams.get("district");

        // Prepare the payload for the Lambda function
        const payload = {
          bucketName: outputs.custom.weatherDatasetBucketName,
          cloudFrontDomain: outputs.custom.weatherCdnDomainName || undefined,
          district: district || undefined,
        };

        // Invoke the Lambda function using the function name key
        const result = await invokeLambdaWithAmplifyContext(
          "getDatasetFunctionName",
          payload,
          contextSpec
        );

        return NextResponse.json(result, { status: 200 });
      } catch (error) {
        console.error("Error fetching dataset:", error);

        return NextResponse.json(
          {
            error: "Failed to fetch dataset",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    },
  });
}

export async function POST(request: NextRequest) {
  return runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (contextSpec) => {
      try {
        const body = await request.json();
        const { district } = body;

        // Prepare the payload for the Lambda function
        const payload = {
          bucketName: outputs.custom.weatherDatasetBucketName,
          cloudFrontDomain: outputs.custom.weatherCdnDomainName || undefined,
          district: district || undefined,
        };

        // Invoke the Lambda function using the function name key
        const result = await invokeLambdaWithAmplifyContext(
          "getDatasetFunctionName",
          payload,
          contextSpec
        );

        return NextResponse.json(result, { status: 200 });
      } catch (error) {
        console.error("Error fetching dataset:", error);

        return NextResponse.json(
          {
            error: "Failed to fetch dataset",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    },
  });
}
