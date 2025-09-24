# CDK Storage Setup Guide

This guide covers setting up S3 storage using CDK custom constructs instead of traditional Amplify storage to avoid circular dependencies and gain better control over bucket policies.

## Architecture Overview

Our Weather Platform uses **CDK Custom Constructs** for storage instead of Amplify's built-in storage to:

- **Eliminate Circular Dependencies**: No conflicts between CloudFront and Amplify bucket policies
- **Better Policy Control**: Full control over IAM permissions and bucket policies
- **CloudFormation Cleanup**: Easier to delete and redeploy stacks without policy conflicts
- **Advanced Configuration**: Lifecycle rules, CORS policies, and custom tags

## Implementation

### 1. CDK Storage Construct

Create the custom storage construct at `amplify/custom/WeatherDatasetStorage/resource.ts`:

```typescript
import { defineBackend } from "@aws-amplify/backend";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { RemovalPolicy } from "aws-cdk-lib";

export function createWeatherDatasetStorage(backend: any) {
  const weatherBucket = new Bucket(backend.stack, "WeatherDatasetBucket", {
    bucketName: `weather-dataset-${backend.stack.account}-${backend.stack.region}`,
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,

    // Lifecycle rules for efficient storage management
    lifecycleRules: [
      {
        id: "DeleteTempDataAfter7Days",
        enabled: true,
        prefix: "temp/",
        expiration: Duration.days(7),
      },
    ],

    // CORS configuration for web access
    cors: [
      {
        allowedOrigins: ["*"],
        allowedMethods: [
          HttpMethods.GET,
          HttpMethods.PUT,
          HttpMethods.POST,
          HttpMethods.DELETE,
        ],
        allowedHeaders: ["*"],
        exposedHeaders: ["ETag"],
        maxAge: 3000,
      },
    ],

    // Resource tags
    tags: {
      Project: "WeatherPlatform",
      Environment: "Development",
      ManagedBy: "CDK",
    },
  });

  return weatherBucket;
}
```

### 2. Backend Integration

Update `amplify/backend.ts` to use the CDK storage:

```typescript
import { defineBackend } from "@aws-amplify/backend";
import { createWeatherDatasetStorage } from "./custom/WeatherDatasetStorage/resource";
import { createCustomCloudFront } from "./custom/CloudFront/resource";

export const backend = defineBackend({
  auth,
  // ... other resources
});

// Create CDK storage bucket
const weatherBucket = createWeatherDatasetStorage(backend);

// Pass bucket to other constructs that need it
const cloudFrontDistribution = createCustomCloudFront(backend, weatherBucket);

// Platform admin permissions
backend.auth.resources.userPool.addDomain("CognitoDomain", {
  cognitoDomain: {
    domainPrefix: `weather-platform-${backend.stack.account}`,
  },
});

// Grant platform admin access to storage
backend.auth.resources.authenticatedUserIamRole.addManagedPolicy(
  ManagedPolicy.fromAwsManagedPolicyName("PowerUserAccess")
);
```

### 3. CloudFront Integration

Update CloudFront to use the CDK bucket directly in `amplify/custom/CloudFront/resource.ts`:

```typescript
export function createCustomCloudFront(backend: any, weatherBucket: Bucket) {
  // Create Origin Access Control
  const originAccessControl = new OriginAccessControl(backend.stack, "OAC", {
    description: "OAC for Weather Dataset Bucket",
    originAccessControlOriginType: OriginAccessControlOriginType.S3,
    signing: Signing.SIGV4_ALWAYS,
  });

  // CloudFront distribution
  const distribution = new Distribution(
    backend.stack,
    "WeatherDatasetDistribution",
    {
      defaultBehavior: {
        origin: new S3Origin(weatherBucket, {
          originAccessControl: originAccessControl,
        }),
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      },
    }
  );

  // Add bucket policy for CloudFront access
  weatherBucket.addToResourcePolicy(
    new PolicyStatement({
      sid: "AllowCloudFrontAccess",
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal("cloudfront.amazonaws.com")],
      actions: ["s3:GetObject"],
      resources: [weatherBucket.arnForObjects("*")],
      conditions: {
        StringEquals: {
          "AWS:SourceArn": `arn:aws:cloudfront::${backend.stack.account}:distribution/${distribution.distributionId}`,
        },
      },
    })
  );

  return distribution;
}
```

## Key Benefits

### 1. No Circular Dependencies

- **Problem Solved**: Amplify storage automatically adds policies that conflict with CloudFront
- **CDK Solution**: We control all policies explicitly, no automatic Amplify interference
- **Result**: Clean CloudFormation deployments and deletions

### 2. Advanced Configuration

- **Lifecycle Rules**: Automatic cleanup of temporary data after 7 days
- **CORS Policies**: Proper web access configuration
- **Resource Tags**: Better organization and cost tracking
- **Removal Policies**: Easy cleanup during development

### 3. Better Permission Control

- **Specific IAM Permissions**: Granular access control
- **Conditional Policies**: Secure CloudFront integration
- **Platform Admin Access**: Comprehensive management permissions

## Deployment

1. **Deploy to sandbox**:

   ```bash
   npx ampx sandbox
   ```

2. **Verify resources**:

   - Check S3 bucket creation in AWS Console
   - Verify CloudFront distribution is working
   - Test bucket policies and permissions

3. **Access bucket from frontend**:

   ```typescript
   // Get bucket name from amplify_outputs.json
   import outputs from "../amplify_outputs.json";

   // Bucket will be available in custom resources
   const bucketName = outputs.custom.WeatherDatasetBucket.bucketName;
   ```

## Common Issues

### CloudFormation Stack Stuck in DELETE_FAILED

If you have existing Amplify storage that's causing conflicts:

1. **Force delete the stack**:

   ```bash
   # Find the stuck stack
   aws cloudformation list-stacks --stack-status-filter DELETE_FAILED

   # Force delete
   aws cloudformation delete-stack --stack-name <stack-name> --retain-resources
   ```

2. **Clean up manually**:
   - Delete S3 bucket contents in AWS Console
   - Remove IAM roles if needed
   - Redeploy with CDK storage

### Permission Errors

If you get access denied errors:

1. **Check IAM permissions** in AWS Console
2. **Verify bucket policies** are correctly applied
3. **Ensure CloudFront OAC** is properly configured

## Integration with Other Services

### Glue Data Pipeline

```typescript
// Grant Glue access to the bucket
weatherBucket.grantReadWrite(glueJobRole);
```

### Lambda Functions

```typescript
// Grant Lambda access
weatherBucket.grantReadWrite(lambdaFunction);
```

### EventBridge Integration

```typescript
// EventBridge can trigger jobs that access the bucket
// Permissions handled through IAM roles
```

## Next Steps

- [CloudFront Distribution Setup](./setup_cloudfront/README.md)
- [AWS Glue Data Pipeline](./setup_glue/README.md)
- [EventBridge Scheduling](./setup_eventbridge/README.md)

## Best Practices

1. **Use specific IAM permissions** instead of wildcards
2. **Implement lifecycle rules** for cost optimization
3. **Enable versioning** for important data
4. **Use CloudFront** for global distribution
5. **Monitor costs** with proper tagging
6. **Test in sandbox** before production deployment

## Troubleshooting

### Bucket Already Exists

- Use unique bucket names with account/region suffixes
- Check for existing buckets in AWS Console

### Policy Conflicts

- Remove any existing Amplify storage first
- Ensure no competing bucket policies
- Use CDK for all bucket management

### CloudFormation Errors

- Check AWS CloudFormation console for detailed errors
- Use `--retain-resources` flag when force deleting stacks
- Clean up resources manually if needed
