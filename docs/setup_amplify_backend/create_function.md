# Setting up Lambda Functions in AWS Amplify Gen 2

This guide covers how to create and configure Lambda functions in AWS Amplify Gen 2, following the official documentation patterns.

## Prerequisites

Before starting, ensure you have:

- AWS Amplify Gen 2 project initialized
- Node.js and npm/pnpm installed
- AWS CLI configured with appropriate permissions
- TypeScript support for Lambda functions

## Install Required Dependencies

First, install the necessary TypeScript definitions for AWS Lambda:

```bash
npm install --save-dev @types/aws-lambda
# or with pnpm
pnpm add -D @types/aws-lambda
```

## Project Structure

Your Amplify project should have the following structure:

```
amplify/
├── backend.ts
├── auth/
│   └── resource.ts
└── functions/
    ├── addThing/
    │   ├── resource.ts
    │   └── handler.ts
    └── getDataset/
        ├── resource.ts
        └── handler.ts
```

## Step 1: Create Function Directories

Create the function directories inside the `amplify/functions/` folder:

```bash
mkdir -p amplify/functions/addThing
mkdir -p amplify/functions/getDataset
```

## Step 2: Define Function Resources

### addThing Function Resource

Create `amplify/functions/addThing/resource.ts`:

```typescript
import { defineFunction } from "@aws-amplify/backend";

export const addThing = defineFunction({
  name: "add-thing",
  entry: "./handler.ts",
  environment: {
    // Environment variables for your function
    AWS_IOT_THING_GROUP_NAME: "ITeaWeatherHub",
    AWS_IOT_POLICY_NAME: "WeatherStationPolicies",
  },
  timeoutSeconds: 30,
  memoryMB: 128,
  runtime: 20, // Node.js 20.x
});
```

### getDataset Function Resource

Create `amplify/functions/getDataset/resource.ts`:

```typescript
import { defineFunction } from "@aws-amplify/backend";

export const getDataset = defineFunction({
  name: "get-dataset",
  entry: "./handler.ts",
  environment: {
    // Environment variables are automatically provided by Amplify
    // Access S3 bucket and IoT resources through Amplify outputs
  },
  timeoutSeconds: 30,
  memoryMB: 256,
  runtime: 20, // Node.js 20.x
});
```

## Step 3: Create Function Handlers

### addThing Handler

Create `amplify/functions/addThing/handler.ts`:

```typescript
import type { Handler } from "aws-lambda";
import { env } from "$amplify/env/add-thing";

// Your function logic here
export const handler: Handler = async (event, context) => {
  console.log("Event received:", JSON.stringify(event, null, 2));

  try {
    // Access environment variables using env
    const thingGroupName = env.AWS_IOT_THING_GROUP_NAME;
    const policyName = env.AWS_IOT_POLICY_NAME;

    // Your business logic here

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Thing created successfully",
        // Add your response data
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
```

### getDataset Handler

Create `amplify/functions/getDataset/handler.ts`:

```typescript
import type { Handler } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export const handler: Handler = async (event, context) => {
  console.log("Event received:", JSON.stringify(event, null, 2));

  try {
    // Initialize AWS clients
    const s3Client = new S3Client({ region: process.env.AWS_REGION });

    // Access dataset from S3 storage
    // Bucket name and other resources are available through Amplify configuration

    // Your business logic here - interact with S3, DynamoDB, etc.

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Dataset retrieved successfully",
        // Add your response data
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
```

## Step 4: Update Backend Configuration

Update your `amplify/backend.ts` file to include the new functions:

```typescript
import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { addThing } from "./functions/addThing/resource";
import { getDataset } from "./functions/getDataset/resource";

export const backend = defineBackend({
  auth,
  addThing,
  getDataset,
});

// Optional: Add custom permissions or configurations
const addThingLambda = backend.addThing.resources.lambda;
const getDatasetLambda = backend.getDataset.resources.lambda;

// Example: Add IAM permissions for IoT operations
import * as iam from "aws-cdk-lib/aws-iam";

// Add IoT permissions to addThing function
addThingLambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: [
      "iot:CreateThing",
      "iot:AddThingToThingGroup",
      "iot:CreateKeysAndCertificate",
      "iot:AttachPolicy",
      "iot:AttachThingPrincipal",
      "iot:DescribeEndpoint",
    ],
    resources: ["*"],
  })
);
```

## Step 5: Deploy Functions

### For Development (Sandbox)

```bash
npx ampx sandbox
```

### For Production

```bash
npx ampx deploy --branch main
```

## Accessing Functions from Frontend

After deployment, your functions will be available in the `amplify_outputs.json` file. You can invoke them from your frontend:

```typescript
// Example: Invoking a function from your Next.js app
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import outputs from "../amplify_outputs.json";

const lambdaClient = new LambdaClient({
  region: outputs.auth.aws_region,
});

const invokeLambda = async (functionName: string, payload: any) => {
  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: JSON.stringify(payload),
  });

  const response = await lambdaClient.send(command);
  return JSON.parse(new TextDecoder().decode(response.Payload));
};
```

## Best Practices

1. **Environment Variables**: Use the `env` import to access environment variables securely
2. **Error Handling**: Always implement proper error handling in your handlers
3. **Logging**: Use `console.log` for debugging, but be mindful of sensitive data
4. **Timeout**: Set appropriate timeout values based on your function's needs
5. **Memory**: Allocate memory based on your function's computational requirements
6. **Runtime**: Use the latest stable Node.js runtime (20.x as of 2024)

## Common Issues and Solutions

### Issue: Environment variables not accessible

**Solution**: Make sure you're using the correct import pattern:

```typescript
import { env } from "$amplify/env/your-function-name";
```

### Issue: Permission denied errors

**Solution**: Add the necessary IAM permissions in your `backend.ts` file

### Issue: Function not found after deployment

**Solution**: Check that the function is properly exported and included in the backend definition

## API Gateway Integration

Functions defined in Amplify Gen 2 are automatically integrated with AWS Lambda. To create HTTP endpoints, you can:

1. **Use Amplify's built-in API**: Functions are accessible via the Amplify client
2. **Custom API Gateway**: Add API Gateway configuration in your backend.ts
3. **Direct Lambda invocation**: Use AWS SDK to invoke functions directly

For HTTP APIs, consider using Amplify's Data API or adding custom API Gateway configuration to your backend.

## Next Steps

- [Setting up Authentication](./authentication/README.md)
- [Configuring API Gateway](./create_api_gateway.md)
- [Setting up Storage](./create_storage.md)
