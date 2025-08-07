import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { AddThingPayload } from "@/types/lambda";

// Server-side function that can read amplify outputs
export async function getAmplifyFunctionName(): Promise<string> {
  const defaultName = process.env.ADD_THING_LAMBDA_FUNCTION_NAME || "add-thing";

  try {
    const amplifyOutputs = await import("../../amplify_outputs.json");
    const customOutputs = (amplifyOutputs as any).custom;
    return customOutputs?.addThingFunctionName || defaultName;
  } catch (error) {
    console.warn(
      "Could not load amplify outputs, using default function name:",
      defaultName
    );
    return defaultName;
  }
}

// Server-side Lambda invocation (for use in API routes)
export async function invokeAddThingLambdaServerSide(payload: AddThingPayload) {
  try {
    // Initialize Lambda client with server's AWS credentials
    const lambdaClient = new LambdaClient({
      region: process.env.AWS_REGION,
      // Server will use the default credential chain (IAM user, role, etc.)
    });

    // Get the actual function name from amplify outputs
    const functionName = await getAmplifyFunctionName();

    const command = new InvokeCommand({
      FunctionName: functionName,
      Payload: JSON.stringify(payload),
    });

    const result = await lambdaClient.send(command);

    if (!result.Payload) {
      throw new Error("No response from Lambda function");
    }

    const responseString = new TextDecoder().decode(result.Payload);
    const lambdaResponse = JSON.parse(responseString);

    return lambdaResponse;
  } catch (error) {
    console.error("Lambda invocation error:", error);
    throw error;
  }
}
