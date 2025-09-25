# API Routes Setup and Lambda Integration

This guide covers how to create Next.js API routes that properly integrate with AWS Lambda functions using Amplify Gen 2 server context.

## Prerequisites

- AWS Amplify Gen 2 project with Lambda functions deployed
- Next.js 15+ with App Router
- Amplify server utilities configured

## Required Files

Before setting up API routes, ensure you have these utility files:

### 1. Amplify Server Utils (`src/utils/amplifyServerUtils.ts`)

```typescript
import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import outputs from "../../amplify_outputs.json";

export const { runWithAmplifyServerContext } = createServerRunner({
  config: outputs,
});
```

### 2. Lambda Invoker (`src/lib/lambdaInvoker.ts`)

```typescript
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { createLambdaClientWithAmplifyContext } from "@/lib/awsConfig";

export async function invokeLambdaWithAmplifyContext(
  functionNameKey: string,
  payload: unknown,
  contextSpec: any
) {
  try {
    const lambdaClient = await createLambdaClientWithAmplifyContext(
      contextSpec
    );

    // Get function name from amplify outputs
    const amplifyOutputs = await import("../../amplify_outputs.json");
    const customOutputs = amplifyOutputs.custom;
    const functionName = customOutputs?.[functionNameKey];

    if (!functionName) {
      throw new Error(`Function name not found for key: ${functionNameKey}`);
    }

    const command = new InvokeCommand({
      FunctionName: functionName,
      Payload: JSON.stringify(payload),
    });

    const result = await lambdaClient.send(command);
    const responseString = new TextDecoder().decode(result.Payload);
    const lambdaResponse = JSON.parse(responseString);

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
```

## API Route Patterns

### 1. Basic GET Route with Lambda Invocation

```typescript
// src/app/api/weather/dataset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { invokeLambdaWithAmplifyContext } from "@/lib/lambdaInvoker";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";

export async function GET(request: NextRequest) {
  return runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (contextSpec) => {
      try {
        // Check if function is deployed
        const amplifyOutputs = await import("../../../../amplify_outputs.json");
        const customOutputs = amplifyOutputs.custom;

        if (!customOutputs?.getDatasetFunctionName) {
          return NextResponse.json(
            {
              error: "Dataset service unavailable",
              message: "Dataset Lambda function is not deployed or configured",
              datasets: {},
            },
            { status: 503 }
          );
        }

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const district = searchParams.get("district");

        // Prepare payload
        const payload = {
          bucketName: customOutputs.weatherDatasetBucketName,
          cloudFrontDomain: customOutputs.weatherCdnDomainName || undefined,
          district: district || undefined,
        };

        // Invoke Lambda function
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
```

### 2. POST Route with Body Parsing

```typescript
export async function POST(request: NextRequest) {
  return runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (contextSpec) => {
      try {
        // Parse request body
        const body = await request.json();
        const { district, startDate, endDate } = body;

        // Validate input
        if (!district) {
          return NextResponse.json(
            { error: "District parameter is required" },
            { status: 400 }
          );
        }

        // Prepare payload
        const payload = {
          district,
          startDate,
          endDate,
          // Include other necessary data from amplify outputs
        };

        const result = await invokeLambdaWithAmplifyContext(
          "getDatasetFunctionName",
          payload,
          contextSpec
        );

        return NextResponse.json(result, { status: 200 });
      } catch (error) {
        console.error("Error processing POST request:", error);
        return NextResponse.json(
          {
            error: "Failed to process request",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    },
  });
}
```

### 3. IoT Device Management Route

```typescript
// src/app/api/iot/fetchThings/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createLambdaClientWithAmplifyContext } from "@/lib/awsConfig";
import { InvokeCommand } from "@aws-sdk/client-lambda";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";

export async function GET() {
  return runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (contextSpec) => {
      try {
        // Get function name from amplify outputs
        const amplifyOutputs = await import(
          "../../../../../amplify_outputs.json"
        );
        const customOutputs = amplifyOutputs.custom;
        const functionName = customOutputs?.fetchThingsFunctionName;

        if (!functionName) {
          throw new Error("fetchThings function not found in amplify outputs");
        }

        // Create Lambda client with Amplify credentials
        const lambdaClient = await createLambdaClientWithAmplifyContext(
          contextSpec
        );

        const command = new InvokeCommand({
          FunctionName: functionName,
          Payload: JSON.stringify({}), // No payload needed for fetching
        });

        const result = await lambdaClient.send(command);
        const responseString = new TextDecoder().decode(result.Payload);
        const lambdaResponse = JSON.parse(responseString);

        if (lambdaResponse.statusCode !== 200) {
          const errorBody =
            typeof lambdaResponse.body === "string"
              ? JSON.parse(lambdaResponse.body)
              : lambdaResponse.body;

          return NextResponse.json(
            {
              error: errorBody.error || "Failed to fetch devices",
              details: errorBody.details || "Lambda function failed",
            },
            { status: lambdaResponse.statusCode || 500 }
          );
        }

        // Parse successful response
        const successBody =
          typeof lambdaResponse.body === "string"
            ? JSON.parse(lambdaResponse.body)
            : lambdaResponse.body;

        return NextResponse.json({
          success: true,
          ...successBody,
          fetchedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Device fetch error:", error);
        return NextResponse.json(
          {
            error: "Failed to fetch devices",
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    },
  });
}
```

## Error Handling Patterns

### 1. Service Unavailable Response

```typescript
if (!customOutputs?.functionName) {
  return NextResponse.json(
    {
      error: "Service unavailable",
      message: "Lambda function is not deployed or configured",
      data: {}, // Return empty data instead of mock data
    },
    { status: 503 }
  );
}
```

### 2. Input Validation

```typescript
// Validate required parameters
const requiredFields = ["district", "startDate"];
const missingFields = requiredFields.filter((field) => !body[field]);

if (missingFields.length > 0) {
  return NextResponse.json(
    {
      error: "Missing required fields",
      missingFields,
    },
    { status: 400 }
  );
}
```

### 3. Lambda Error Handling

```typescript
try {
  const result = await invokeLambdaWithAmplifyContext(
    "functionNameKey",
    payload,
    contextSpec
  );
  return NextResponse.json(result, { status: 200 });
} catch (error) {
  console.error("Lambda invocation failed:", error);

  // Check if it's a Lambda-specific error
  if (error.message.includes("AccessDenied")) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  return NextResponse.json(
    {
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    },
    { status: 500 }
  );
}
```

## Security Best Practices

1. **Always use `runWithAmplifyServerContext`** for proper authentication
2. **Validate all inputs** before passing to Lambda functions
3. **Never return sensitive data** in error responses
4. **Log errors appropriately** without exposing internal details
5. **Use proper HTTP status codes** for different error types
6. **Sanitize output** before sending to clients

## Development vs Production

### Development (.env.local)

```env
DEFAULT_PROFILE=your-aws-profile
DEFAULT_REGION=us-east-1
```

### Production

- Amplify automatically provides IAM roles and credentials
- No additional configuration needed
- Ensure proper IAM permissions are set in `backend.ts`

## Testing API Routes

### Using curl

```bash
# GET request
curl -X GET "http://localhost:3000/api/weather/dataset?district=district1"

# POST request
curl -X POST "http://localhost:3000/api/weather/dataset" \
  -H "Content-Type: application/json" \
  -d '{"district": "district1", "startDate": "2025-01-01"}'
```

### Using fetch in frontend

```typescript
const fetchDataset = async (district?: string) => {
  const url = district
    ? `/api/weather/dataset?district=${district}`
    : "/api/weather/dataset";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};
```

## Troubleshooting

### Common Issues

1. **"Could not load credentials from any providers"**

   - Ensure `runWithAmplifyServerContext` is used
   - Check that AWS profile is configured for development

2. **"Function name not found for key"**

   - Verify the function name key exists in `amplify_outputs.json`
   - Check that the Lambda function is properly deployed

3. **Permission denied errors**
   - Ensure authenticated role has Lambda invoke permissions
   - Check IAM policies in `backend.ts`

### Debug Steps

1. Check `amplify_outputs.json` for function names
2. Verify Lambda function deployment status
3. Check CloudWatch logs for detailed error messages
4. Test Lambda function directly in AWS console
