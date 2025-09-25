import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { AddThingPayload } from "@/types/lambda";
import { createLambdaClientWithAmplifyContext } from "@/lib/awsConfig";

// Cache for Lambda client to avoid recreating
let cachedLambdaClient: LambdaClient | null = null;

// Create Lambda client with proper credential handling
async function createLambdaClientWithCredentials(): Promise<LambdaClient> {
  if (cachedLambdaClient) {
    return cachedLambdaClient;
  }

  const region =
    process.env.AWS_REGION || process.env.DEFAULT_REGION || "us-east-1";

  // Detect environment and configure credentials accordingly
  const isProduction = !!(
    (
      process.env.AWS_EXECUTION_ENV || // Lambda functions
      process.env.AWS_LAMBDA_FUNCTION_NAME || // Lambda functions
      process.env.AWS_ACCESS_KEY_ID || // Amplify hosting with credentials
      process.env.AMPLIFY_BRANCH
    ) // Amplify environment indicator
  );

  console.log("Lambda client environment detection:", {
    isProduction,
    region,
    hasAwsCredentials: !!process.env.AWS_ACCESS_KEY_ID,
    amplifyBranch: process.env.AMPLIFY_BRANCH,
  });

  const config: any = { region };

  if (isProduction) {
    // Production: Use provided credentials or let AWS SDK use IAM roles
    if (process.env.AWS_ACCESS_KEY_ID) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        ...(process.env.AWS_SESSION_TOKEN && {
          sessionToken: process.env.AWS_SESSION_TOKEN,
        }),
      };
      console.log("Using explicit AWS credentials for Lambda client");
    } else {
      console.log(
        "Using IAM roles for Lambda client (no explicit credentials)"
      );
    }
  } else {
    // Development: Use AWS CLI profile
    try {
      const { fromNodeProviderChain } = await import(
        "@aws-sdk/credential-providers"
      );
      config.credentials = fromNodeProviderChain({
        profile: process.env.DEFAULT_PROFILE,
      });
      console.log(`Using AWS CLI profile: ${process.env.DEFAULT_PROFILE}`);
    } catch (error) {
      console.error("Failed to load credential provider chain:", error);
      throw new Error(
        "AWS credentials not available for local development. Please set DEFAULT_PROFILE in .env.local"
      );
    }
  }

  cachedLambdaClient = new LambdaClient(config);
  return cachedLambdaClient;
}

// Server-side function that can read amplify outputs for add thing
export async function getAmplifyFunctionName(): Promise<string> {
  const defaultName = "add-thing";

  try {
    const amplifyOutputs = await import("../../amplify_outputs.json");
    const customOutputs = (
      amplifyOutputs as { custom?: { addThingFunctionName?: string } }
    ).custom;
    return customOutputs?.addThingFunctionName || defaultName;
  } catch {
    console.warn(
      "Could not load amplify outputs, using default function name:",
      defaultName
    );
    return defaultName;
  }
}

// Server-side function that can read amplify outputs for delete thing
export async function getAmplifyDeleteFunctionName(): Promise<string> {
  const defaultName = "delete-thing";

  try {
    const amplifyOutputs = await import("../../amplify_outputs.json");
    const customOutputs = (
      amplifyOutputs as { custom?: { deleteThingFunctionName?: string } }
    ).custom;
    return customOutputs?.deleteThingFunctionName || defaultName;
  } catch {
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
    // Get pre-configured Lambda client with proper credentials
    const lambdaClient = await createLambdaClientWithCredentials();

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
    // Get pre-configured Lambda client with proper credentials
    const lambdaClient = await createLambdaClientWithCredentials();

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
