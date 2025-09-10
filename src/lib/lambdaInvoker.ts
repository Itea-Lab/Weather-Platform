import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { AddThingPayload } from "@/types/lambda";

// Create Lambda client with environment region (used internally by lambdaInvoker)
function createLambdaClientWithEnvRegion(): LambdaClient {
  const region =
    process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  return new LambdaClient({ region });
}

// Server-side function that can read amplify outputs for add thing
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

// Server-side function that can read amplify outputs for delete thing
export async function getAmplifyDeleteFunctionName(): Promise<string> {
  const defaultName =
    process.env.DELETE_THING_LAMBDA_FUNCTION_NAME || "delete-thing";

  try {
    const amplifyOutputs = await import("../../amplify_outputs.json");
    const customOutputs = (amplifyOutputs as any).custom;
    return customOutputs?.deleteThingFunctionName || defaultName;
  } catch (error) {
    console.warn(
      "Could not load amplify outputs for delete function, using default:",
      defaultName
    );
    return defaultName;
  }
}

// Server-side Lambda invocation for adding things (for use in API routes)
export async function invokeAddThingLambdaServerSide(payload: AddThingPayload) {
  try {
    // Get pre-configured Lambda client with environment region
    const lambdaClient = createLambdaClientWithEnvRegion();

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
    console.error("Add Lambda invocation error:", error);
    throw error;
  }
}

// Server-side Lambda invocation for deleting things
export async function invokeDeleteThingLambdaServerSide(payload: {
  thingName: string;
}) {
  try {
    // Get pre-configured Lambda client with environment region
    const lambdaClient = createLambdaClientWithEnvRegion();

    // Get the actual function name from amplify outputs
    const functionName = await getAmplifyDeleteFunctionName();

    const command = new InvokeCommand({
      FunctionName: functionName,
      Payload: JSON.stringify(payload),
    });

    const result = await lambdaClient.send(command);

    if (!result.Payload) {
      throw new Error("No response from delete Lambda function");
    }

    const responseString = new TextDecoder().decode(result.Payload);
    const lambdaResponse = JSON.parse(responseString);

    return lambdaResponse;
  } catch (error) {
    console.error("Delete Lambda invocation error:", error);
    throw error;
  }
}

// Generic Lambda invoker function
export async function invokeLambda(functionNameKey: string, payload: any) {
  try {
    // Get pre-configured Lambda client with environment region
    const lambdaClient = createLambdaClientWithEnvRegion();

    // Get the actual function name from amplify outputs
    const amplifyOutputs = await import("../../amplify_outputs.json");
    const customOutputs = (amplifyOutputs as any).custom;
    const functionName = customOutputs?.[functionNameKey];

    if (!functionName) {
      throw new Error(`Function name not found for key: ${functionNameKey}`);
    }

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

    // Handle Lambda response format
    if (lambdaResponse.statusCode === 200) {
      return JSON.parse(lambdaResponse.body);
    } else {
      const errorResponse = JSON.parse(lambdaResponse.body);
      throw new Error(errorResponse.error || "Lambda function error");
    }
  } catch (error) {
    console.error("Lambda invocation error:", error);
    throw error;
  }
}
