import { InvokeCommand } from "@aws-sdk/client-lambda";
import { createLambdaClientWithAmplifyContext } from "@/lib/awsConfig";

// Generic Lambda invoker function with Amplify server context
export async function invokeLambdaWithAmplifyContext(
  functionNameKey: string,
  payload: unknown,
  contextSpec: any
) {
  try {
    // Get pre-configured Lambda client with Amplify credentials
    const lambdaClient = await createLambdaClientWithAmplifyContext(
      contextSpec
    );

    // Get the actual function name from amplify outputs
    const amplifyOutputs = await import("../../amplify_outputs.json");
    const customOutputs = (
      amplifyOutputs as { custom?: Record<string, string> }
    ).custom;
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
    console.error("Lambda invocation with Amplify context error:", error);
    throw error;
  }
}
