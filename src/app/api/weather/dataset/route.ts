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
          // Return mock data when Lambda function is not deployed
          console.warn(
            "getDataset Lambda function not found, returning mock data"
          );
          return NextResponse.json(
            {
              datasets: {
                district1: {
                  latest_update: "2025-09-03T05:26:37Z",
                  url: "https://d1wbddrjyd2c3o.cloudfront.net/dataset/district1/all_data_20250903_052637.csv/part-00000.csv",
                  size_bytes: 2576980377,
                  size_formatted: "2.4 GB",
                },
                district2: {
                  latest_update: "2025-09-03T04:15:22Z",
                  url: "https://d1wbddrjyd2c3o.cloudfront.net/dataset/district2/all_data_20250903_041522.csv/part-00000.csv",
                  size_bytes: 1835008000,
                  size_formatted: "1.7 GB",
                },
                district5: {
                  latest_update: "2025-09-03T03:45:12Z",
                  url: "https://d1wbddrjyd2c3o.cloudfront.net/dataset/district5/all_data_20250903_034512.csv/part-00000.csv",
                  size_bytes: 3221225472,
                  size_formatted: "3.0 GB",
                },
              },
            },
            { status: 200 }
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
