# Custom Services Setup (CDK Constructs)

This guide covers how to create and integrate custom AWS services using CDK constructs within Amplify Gen 2 backend.

## Overview

Amplify Gen 2 allows you to extend beyond the built-in resources (Auth, Functions, Storage, Data) by using **CDK constructs** for custom infrastructure. This enables you to create complex, production-ready services while maintaining Amplify's deployment and management benefits.

## Architecture Pattern

Our Weather Platform uses a hybrid approach:

- **Amplify Gen 2**: Authentication, Lambda functions, and deployment management
- **CDK Custom Constructs**: Advanced infrastructure (S3, CloudFront, Glue, EventBridge)
- **No Circular Dependencies**: Clean separation eliminates CloudFormation conflicts

## Custom Services Structure

```
amplify/
├── backend.ts                     # Main backend configuration
├── custom/                        # Custom CDK constructs
│   ├── WeatherDatasetStorage/     # S3 bucket with CORS
│   │   └── resource.ts
│   ├── CloudFront/                # CDN distribution
│   │   ├── resource.ts
│   │   └── cloudformation-template.json
│   ├── WeatherDataGlue/           # Data cataloging & ETL
│   │   ├── resource.ts
│   │   └── weather-transform.py
│   └── EventBridge/               # Scheduled processing
│       └── resource.ts
```

## Creating Custom Services

### Step 1: Create Custom Construct Directory

```bash
mkdir -p amplify/custom/YourServiceName
```

### Step 2: Create Resource File

Create `amplify/custom/YourServiceName/resource.ts`:

```typescript
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
// Import specific AWS service constructs
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";

export interface YourServiceProps {
  // Define configurable properties
  bucketName?: string;
  enableFeature?: boolean;
}

export class YourServiceName extends Construct {
  // Expose resources that other services might need
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: YourServiceProps = {}) {
    super(scope, id);

    const { bucketName, enableFeature = false } = props;

    // Create AWS resources using CDK
    this.bucket = new s3.Bucket(this, "ServiceBucket", {
      bucketName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      // ... other configurations
    });
  }
}
```

### Step 3: Import in backend.ts

Update `amplify/backend.ts`:

```typescript
import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { YourServiceName } from "./custom/YourServiceName/resource";

export const backend = defineBackend({
  auth,
  // ... other resources
});

// Create custom service instance
const yourService = new YourServiceName(backend.stack, "YourServiceName", {
  bucketName: `your-service-${backend.stack.account}-${branchName}`,
  enableFeature: true,
});

// Add to outputs for client-side access
backend.addOutput({
  custom: {
    yourServiceBucketName: yourService.bucket.bucketName,
  },
});
```

## Real Examples from Weather Platform

### 1. S3 Storage with CORS

**File:** `amplify/custom/WeatherDatasetStorage/resource.ts`

```typescript
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface WeatherDatasetStorageProps {
  bucketName?: string;
  enableVersioning?: boolean;
  enablePublicAccess?: boolean;
}

export class WeatherDatasetStorage extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(
    scope: Construct,
    id: string,
    props: WeatherDatasetStorageProps = {}
  ) {
    super(scope, id);

    const {
      bucketName,
      enableVersioning = false,
      enablePublicAccess = false,
    } = props;

    // Create S3 bucket with proper configuration
    this.bucket = new s3.Bucket(this, "WeatherDatasetBucket", {
      bucketName: bucketName || `weather-dataset-${cdk.Aws.ACCOUNT_ID}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: enableVersioning,
      publicReadAccess: enablePublicAccess,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedHeaders: ["*"],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ["*"],
          maxAge: 3000,
        },
      ],
    });
  }
}
```

### 2. CloudFront CDN Distribution

**File:** `amplify/custom/CloudFront/resource.ts`

```typescript
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { CfnOutput, Stack, Aws } from "aws-cdk-lib";

export interface CustomCloudFrontProps {
  storageBucketName: string;
  storageBucketDomainName: string;
  storageBucket?: s3.IBucket;
}

export class CustomCloudFront extends Construct {
  public readonly distribution: cloudfront.CfnDistribution;
  public readonly domainName: string;
  public readonly distributionId: string;

  constructor(scope: Construct, id: string, props: CustomCloudFrontProps) {
    super(scope, id);

    const stack = Stack.of(this);
    const stackName = stack.stackName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const uniqueSuffix = `${stackName}-${Aws.ACCOUNT_ID.slice(-8)}`;

    // Create Origin Access Control
    const originAccessControl = new cloudfront.CfnOriginAccessControl(
      this,
      "OriginAccessControl",
      {
        originAccessControlConfig: {
          name: `weather-oac-${uniqueSuffix}`.slice(0, 64),
          originAccessControlOriginType: "s3",
          signingBehavior: "always",
          signingProtocol: "sigv4",
          description: "Origin Access Control for Weather Dataset S3 Bucket",
        },
      }
    );

    // Create CloudFront Distribution
    this.distribution = new cloudfront.CfnDistribution(this, "Distribution", {
      distributionConfig: {
        enabled: true,
        comment: `Weather Dataset CDN - ${stackName}`,
        defaultRootObject: "index.html",
        origins: [
          {
            id: "S3Origin",
            domainName: props.storageBucketDomainName,
            s3OriginConfig: {
              originAccessIdentity: "", // Empty for OAC
            },
            originAccessControlId: originAccessControl.getAtt("Id"),
          },
        ],
        defaultCacheBehavior: {
          targetOriginId: "S3Origin",
          viewerProtocolPolicy: "redirect-to-https",
          allowedMethods: ["GET", "HEAD", "OPTIONS"],
          cachedMethods: ["GET", "HEAD"],
          compress: true,
          forwardedValues: {
            queryString: false,
            cookies: { forward: "none" },
          },
        },
        priceClass: "PriceClass_100", // Use only North America and Europe
      },
    });

    // Grant CloudFront access to S3 bucket
    if (props.storageBucket) {
      props.storageBucket.addToResourcePolicy(
        new iam.PolicyStatement({
          actions: ["s3:GetObject"],
          resources: [`${props.storageBucket.bucketArn}/*`],
          principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
          conditions: {
            StringEquals: {
              "AWS:SourceArn": `arn:aws:cloudfront::${Aws.ACCOUNT_ID}:distribution/${this.distribution.ref}`,
            },
          },
        })
      );
    }

    this.domainName = this.distribution.attrDomainName;
    this.distributionId = this.distribution.ref;
  }
}
```

### 3. AWS Glue Data Catalog & ETL

**File:** `amplify/custom/WeatherDataGlue/resource.ts`

```typescript
import * as iam from "aws-cdk-lib/aws-iam";
import * as glue from "aws-cdk-lib/aws-glue";
import { Construct } from "constructs";

export interface CustomWeatherDataGlueProps {
  accountId: string;
  region: string;
  sourceBucketName: string;
  targetBucketName: string;
  databaseName?: string;
}

export class CustomWeatherDataGlue extends Construct {
  public readonly database: glue.CfnDatabase;
  public readonly crawler: glue.CfnCrawler;
  public readonly job: glue.CfnJob;

  constructor(scope: Construct, id: string, props: CustomWeatherDataGlueProps) {
    super(scope, id);

    const {
      accountId,
      region,
      sourceBucketName,
      targetBucketName,
      databaseName,
    } = props;

    // Generate unique names
    const uniqueSuffix = this.node.addr.substring(0, 8);
    const dbName = databaseName || `weather_data_catalog_${uniqueSuffix}`;
    const crawlerName = `WeatherPlatformCrawler-${uniqueSuffix}`;
    const jobName = `WeatherDataTransformJob-${uniqueSuffix}`;

    // Create Glue Database
    this.database = new glue.CfnDatabase(this, "WeatherDataCatalog", {
      catalogId: accountId,
      databaseInput: {
        name: dbName,
        description: "Database for weather platform telemetry data",
      },
    });

    // Create IAM Role for Glue
    const glueRole = new iam.Role(this, "GlueServiceRole", {
      assumedBy: new iam.ServicePrincipal("glue.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSGlueServiceRole"
        ),
      ],
      inlinePolicies: {
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket",
              ],
              resources: [
                `arn:aws:s3:::${sourceBucketName}`,
                `arn:aws:s3:::${sourceBucketName}/*`,
                `arn:aws:s3:::${targetBucketName}`,
                `arn:aws:s3:::${targetBucketName}/*`,
              ],
            }),
          ],
        }),
      },
    });

    // Create Glue Crawler
    this.crawler = new glue.CfnCrawler(this, "WeatherDataCrawler", {
      name: crawlerName,
      role: glueRole.roleArn,
      databaseName: this.database.ref,
      targets: {
        s3Targets: [
          {
            path: `s3://${sourceBucketName}/telemetry-data/`,
          },
        ],
      },
      description: "Crawler for weather telemetry data",
      schedule: {
        scheduleExpression: "cron(0 2 * * ? *)", // Daily at 2 AM UTC
      },
    });

    // Create Glue ETL Job
    this.job = new glue.CfnJob(this, "WeatherDataTransformJob", {
      name: jobName,
      role: glueRole.roleArn,
      command: {
        name: "glueetl",
        scriptLocation: `s3://${targetBucketName}/scripts/weather-transform.py`,
        pythonVersion: "3",
      },
      defaultArguments: {
        "--job-language": "python",
        "--job-bookmark-option": "job-bookmark-enable",
        "--enable-metrics": "true",
        "--enable-continuous-cloudwatch-log": "true",
        "--SOURCE_BUCKET": sourceBucketName,
        "--TARGET_BUCKET": targetBucketName,
        "--DATABASE_NAME": this.database.ref,
      },
      maxRetries: 1,
      timeout: 60, // 60 minutes
      glueVersion: "4.0",
    });
  }
}
```

### 4. EventBridge Scheduled Processing

**File:** `amplify/custom/EventBridge/resource.ts`

```typescript
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface CustomEventBridgeProps {
  targetLambdaArn: string;
  scheduleExpression?: string;
  ruleName?: string;
}

export class CustomEventBridge extends Construct {
  public readonly rule: events.Rule;

  constructor(scope: Construct, id: string, props: CustomEventBridgeProps) {
    super(scope, id);

    const {
      targetLambdaArn,
      scheduleExpression = "rate(1 day)", // Default: daily
      ruleName,
    } = props;

    // Generate unique rule name
    const uniqueSuffix = this.node.addr.substring(0, 8);
    const finalRuleName = ruleName || `WeatherDataProcessing-${uniqueSuffix}`;

    // Create EventBridge Rule
    this.rule = new events.Rule(this, "WeatherProcessingRule", {
      ruleName: finalRuleName,
      description: "Scheduled rule for weather data processing",
      schedule: events.Schedule.expression(scheduleExpression),
      enabled: true,
    });

    // Import existing Lambda function
    const targetLambda = lambda.Function.fromFunctionArn(
      this,
      "TargetLambda",
      targetLambdaArn
    );

    // Add Lambda as target
    this.rule.addTarget(new targets.LambdaFunction(targetLambda));

    // Grant EventBridge permission to invoke Lambda
    targetLambda.addPermission("AllowEventBridgeInvoke", {
      principal: new iam.ServicePrincipal("events.amazonaws.com"),
      sourceArn: this.rule.ruleArn,
    });
  }
}
```

## Integration in backend.ts

Here's how to integrate all custom services in your main backend file:

```typescript
import { defineBackend } from "@aws-amplify/backend";
import * as iam from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";
import { addThing } from "./functions/addThing/resource";
import { getDataset } from "./functions/getDataset/resource";
// Import custom constructs
import { WeatherDatasetStorage } from "./custom/WeatherDatasetStorage/resource";
import { CustomWeatherDataGlue } from "./custom/WeatherDataGlue/resource";
import { CustomEventBridge } from "./custom/EventBridge/resource";
import { CustomCloudFront } from "./custom/CloudFront/resource";

export const backend = defineBackend({
  auth,
  addThing,
  getDataset,
  // Add other functions...
});

// Get Lambda references
const getDatasetLambda = backend.getDataset.resources.lambda;
const region = getDatasetLambda.stack.region;
const accountId = getDatasetLambda.stack.account;

// Extract branch name for unique resource naming
const stackName = backend.stack.stackName.toLowerCase();
const branchName = stackName.includes("sandbox")
  ? "sandbox"
  : stackName.includes("dev")
  ? "dev"
  : stackName.includes("prod")
  ? "prod"
  : "default";

// 1. Create Weather Dataset Storage
const weatherStorage = new WeatherDatasetStorage(
  backend.stack,
  "WeatherDatasetStorage",
  {
    bucketName: `weather-dataset-${accountId}-${branchName}`,
    enableVersioning: false,
    enablePublicAccess: false,
  }
);

// 2. Create CloudFront Distribution
const cloudFront = new CustomCloudFront(backend.stack, "WeatherCloudFront", {
  storageBucketName: weatherStorage.bucket.bucketName,
  storageBucketDomainName: weatherStorage.bucket.bucketDomainName,
  storageBucket: weatherStorage.bucket,
});

// 3. Create Glue Data Processing
const glueService = new CustomWeatherDataGlue(
  backend.stack,
  "WeatherDataGlue",
  {
    accountId,
    region,
    sourceBucketName: weatherStorage.bucket.bucketName,
    targetBucketName: weatherStorage.bucket.bucketName,
    databaseName: `weather_catalog_${branchName}`,
  }
);

// 4. Create EventBridge Scheduling
const eventBridge = new CustomEventBridge(backend.stack, "WeatherEventBridge", {
  targetLambdaArn: getDatasetLambda.functionArn,
  scheduleExpression: "cron(0 2 ? * MON *)", // Weekly on Monday at 2 AM
  ruleName: `WeatherProcessing-${branchName}`,
});

// Grant Lambda permissions to access custom resources
getDatasetLambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["s3:GetObject", "s3:ListBucket"],
    resources: [
      weatherStorage.bucket.bucketArn,
      `${weatherStorage.bucket.bucketArn}/*`,
    ],
  })
);

// Add custom outputs for client-side access
backend.addOutput({
  custom: {
    weatherDatasetBucketName: weatherStorage.bucket.bucketName,
    weatherCdnDomainName: cloudFront.domainName,
    weatherCdnDistributionId: cloudFront.distributionId,
    glueJobName: glueService.job.name || "",
    glueCrawlerName: glueService.crawler.name || "",
    glueDatabaseName: glueService.database.ref,
  },
});
```

## Best Practices

### 1. Resource Naming

- **Use branch-specific names** to avoid conflicts across environments
- **Include account ID** for global uniqueness
- **Limit name length** (e.g., CloudFront OAC has 64 char limit)

### 2. IAM Permissions

- **Grant minimal required permissions** to Lambda functions
- **Use specific resource ARNs** instead of wildcards when possible
- **Separate policies by functionality**

### 3. Cost Management

- **Use appropriate pricing tiers** (e.g., CloudFront PriceClass_100)
- **Set auto-delete policies** for development resources
- **Monitor resource usage** regularly

### 4. Error Handling

- **Add CloudWatch logs** to Glue jobs and crawlers
- **Set appropriate timeouts** and retry policies
- **Create meaningful error messages**

### 5. Environment Separation

- **Use stack name detection** for branch-specific resources
- **Maintain separate databases** per environment
- **Configure different schedules** for dev vs prod

## Deployment

Deploy your custom services along with Amplify backend:

```bash
# Deploy to sandbox (development)
npx ampx sandbox

# Deploy to specific branch
npx ampx pipeline-deploy --branch dev

# Deploy to production
npx ampx pipeline-deploy --branch prod
```

## Accessing Custom Resources

### In Lambda Functions

```typescript
// Access from environment variables or amplify outputs
const bucketName = process.env.WEATHER_DATASET_BUCKET_NAME;
const cdnDomain = process.env.WEATHER_CDN_DOMAIN_NAME;
```

### In Frontend Code

```typescript
import outputs from "./amplify_outputs.json";

// Access custom resources
const bucketName = outputs.custom.weatherDatasetBucketName;
const cdnDomain = outputs.custom.weatherCdnDomainName;
```

## Troubleshooting

### Common Issues

**Issue:** Resource name conflicts between branches
**Solution:** Use branch-specific naming with account ID

**Issue:** CDK deployment fails with permission errors
**Solution:** Ensure your AWS profile has sufficient CDK permissions

**Issue:** Custom resources not appearing in outputs
**Solution:** Check `backend.addOutput()` configuration

### Useful Commands

```bash
# Check CDK diff before deployment
npx ampx sandbox --debug

# View CloudFormation stack in AWS Console
# Navigate to CloudFormation > Stacks > amplify-[app-name]-[branch]

# Check custom resource status
aws s3 ls # List S3 buckets
aws glue get-databases # List Glue databases
aws events list-rules # List EventBridge rules
```

## Next Steps

After setting up custom services:

1. [Configure Lambda Function Permissions](./create_function.md#lambda-permissions)
2. [Set up IoT Device Management](./add_device.md/README.md)
3. [Configure Frontend Integration](../functionality/README.md)

## Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Amplify Gen 2 Custom Resources](https://docs.amplify.aws/nextjs/build-a-backend/add-aws-services/)
- [CloudFormation Resource Reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html)
