import { defineBackend } from "@aws-amplify/backend";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib";
import { auth } from "./auth/resource";
import { addThing } from "./functions/addThing/resource";
import { fetchThings } from "./functions/fetchThings/resource";
import { deleteThing } from "./functions/deleteThing/resource";
import { getIoTEndpoint } from "./functions/getIoTEndpoint/resource";
import { getDataset } from "./functions/getDataset/resource";
import { WeatherDatasetStorage } from "./custom/WeatherDatasetStorage/resource";
import { CustomWeatherDataGlue } from "./custom/WeatherDataGlue/resource";
import { CustomEventBridge } from "./custom/EventBridge/resource";
import { CustomCloudFront } from "./custom/CloudFront/resource";

export const backend = defineBackend({
  auth,
  addThing,
  fetchThings,
  deleteThing,
  getIoTEndpoint,
  getDataset,
});

const addThingLambda = backend.addThing.resources.lambda;
const fetchThingsLambda = backend.fetchThings.resources.lambda;
const deleteThingLambda = backend.deleteThing.resources.lambda;
const getIoTEndpointLambda = backend.getIoTEndpoint.resources.lambda;
const getDatasetLambda = backend.getDataset.resources.lambda;
const region = addThingLambda.stack.region;
const accountId = addThingLambda.stack.account;

// Create custom CDK storage construct for weather dataset
const weatherStorage = new WeatherDatasetStorage(
  backend.stack,
  "WeatherDatasetStorage",
  {
    bucketName: `weather-dataset-${accountId}`,
  }
);

// IoT permissions for the addThing Lambda function
const iotPolicyStatement = new iam.PolicyStatement({
  sid: "AllowIoTActions",
  actions: [
    "iot:CreateThing",
    "iot:AddThingToThingGroup",
    "iot:AttachThingPrincipal",
    "iot:AttachPolicy",
    "iot:DescribeThing",
    "iot:DescribeEndpoint",
    "iot:ListThingGroupsForThing",
    "iot:ListPrincipalPolicies",
    "iot:CreateKeysAndCertificate",
    "iot:UpdateCertificate",
  ],
  resources: [
    `arn:aws:iot:${region}:${accountId}:thing/*`,
    `arn:aws:iot:${region}:${accountId}:thinggroup/ITeaWeatherHub`,
    `arn:aws:iot:${region}:${accountId}:policy/WeatherStationPolicies`,
    `arn:aws:iot:${region}:${accountId}:cert/*`,
    "*", // DescribeEndpoint requires wildcard resource
  ],
});

// IoT permissions for the fetchThings Lambda function
const fetchThingsIoTPolicyStatement = new iam.PolicyStatement({
  sid: "AllowFetchThingsIoTActions",
  actions: [
    "iot:ListThingsInThingGroup",
    "iot:DescribeThing",
    "iot:DescribeThingGroup",
  ],
  resources: [
    `arn:aws:iot:${region}:${accountId}:thing/*`,
    `arn:aws:iot:${region}:${accountId}:thinggroup/ITeaWeatherHub`,
  ],
});

// IoT permissions for the deleteThing Lambda function
const deleteThingsIoTPolicyStatement = new iam.PolicyStatement({
  sid: "AllowDeleteThingsIoTActions",
  actions: [
    "iot:DeleteThing",
    "iot:RemoveThingFromThingGroup",
    "iot:DetachThingPrincipal",
    "iot:DetachPolicy",
    "iot:ListThingPrincipals",
    "iot:DeleteCertificate",
    "iot:UpdateCertificate",
    "iot:DescribeThing",
  ],
  resources: [
    `arn:aws:iot:${region}:${accountId}:thing/*`,
    `arn:aws:iot:${region}:${accountId}:thinggroup/ITeaWeatherHub`,
    `arn:aws:iot:${region}:${accountId}:policy/WeatherStationPolicies`,
    `arn:aws:iot:${region}:${accountId}:cert/*`,
  ],
});

// STS permissions for Lambda functions
const stsPolicyStatement = new iam.PolicyStatement({
  sid: "AllowSTSAccess",
  actions: ["sts:GetCallerIdentity"],
  resources: ["*"],
});

// Apply permissions to addThing Lambda
addThingLambda.addToRolePolicy(iotPolicyStatement);
addThingLambda.addToRolePolicy(stsPolicyStatement);

// Apply permissions to fetchThings Lambda
fetchThingsLambda.addToRolePolicy(fetchThingsIoTPolicyStatement);
fetchThingsLambda.addToRolePolicy(stsPolicyStatement);

// Apply permissions to deleteThing Lambda
deleteThingLambda.addToRolePolicy(deleteThingsIoTPolicyStatement);
deleteThingLambda.addToRolePolicy(stsPolicyStatement);

// Apply permissions to getIoTEndpoint Lambda
const getIoTEndpointPolicyStatement = new iam.PolicyStatement({
  sid: "AllowGetIoTEndpoint",
  actions: ["iot:DescribeEndpoint"],
  resources: ["*"], // DescribeEndpoint requires wildcard resource
});
getIoTEndpointLambda.addToRolePolicy(getIoTEndpointPolicyStatement);
getIoTEndpointLambda.addToRolePolicy(stsPolicyStatement);

// Grant authenticated users permission to invoke all Lambda functions
const authenticatedRole = backend.auth.resources.authenticatedUserIamRole;
authenticatedRole.addToPrincipalPolicy(
  new iam.PolicyStatement({
    sid: "AllowLambdaInvoke",
    effect: iam.Effect.ALLOW,
    actions: ["lambda:InvokeFunction"],
    resources: [
      addThingLambda.functionArn,
      fetchThingsLambda.functionArn,
      deleteThingLambda.functionArn,
      getIoTEndpointLambda.functionArn,
    ],
  })
);

// Add AWS managed policies for IoT AUTHENTICATED USERS
authenticatedRole.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName("AWSIoTDataAccess")
);
authenticatedRole.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName("AWSIoTConfigAccess")
);
authenticatedRole.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonCognitoPowerUser")
);

// Add S3 permissions for authenticated users to access dataset files
authenticatedRole.addToPrincipalPolicy(
  new iam.PolicyStatement({
    sid: "AllowS3DatasetAccess",
    effect: iam.Effect.ALLOW,
    actions: ["s3:GetObject", "s3:ListBucket", "s3:ListObjectsV2"],
    resources: [
      weatherStorage.bucket.bucketArn,
      `${weatherStorage.bucket.bucketArn}/dataset/*`,
    ],
  })
);

// Add additional S3 permissions for platform admins to manage bucket content
authenticatedRole.addToPrincipalPolicy(
  new iam.PolicyStatement({
    sid: "AllowS3AdminAccess",
    effect: iam.Effect.ALLOW,
    actions: [
      "s3:PutObject",
      "s3:PutObjectAcl",
      "s3:DeleteObject",
      "s3:GetBucketLocation",
      "s3:ListBucketMultipartUploads",
      "s3:ListMultipartUploadParts",
      "s3:AbortMultipartUpload",
    ],
    resources: [
      weatherStorage.bucket.bucketArn,
      `${weatherStorage.bucket.bucketArn}/*`,
    ],
    conditions: {
      StringLike: {
        "cognito-identity.amazonaws.com:aud":
          backend.auth.resources.identityPoolId,
      },
    },
  })
);

// Attach platform-admin group to Amplify Authenticated role
const userPool = backend.auth.resources.userPool;

const platformAdminGroup = new cognito.CfnUserPoolGroup(
  backend.stack,
  "PlatformAdminGroup",
  {
    groupName: "platform-admin",
    userPoolId: userPool.userPoolId,
    roleArn: authenticatedRole.roleArn,
    description: "Platform administrators with elevated permissions.",
  }
);

// Create Weather Data Glue construct
const weatherDataGlue = new CustomWeatherDataGlue(
  backend.stack,
  "WeatherDataGlue",
  {
    accountId,
    region,
    sourceBucketName: "itea-weather-data-lake-storage", // Hardcoded source bucket with raw data
    targetBucketName: weatherStorage.bucket.bucketName, // CDK bucket for processed data
  }
);

// Create CloudFront CDN construct (uses CloudFormation template)
// Now using CDK bucket as origin with proper IAM permissions
const cloudFrontCDN = new CustomCloudFront(backend.stack, "WeatherDatasetCDN", {
  storageBucketName: weatherStorage.bucket.bucketName,
  storageBucketDomainName: weatherStorage.bucket.bucketDomainName,
  storageBucket: weatherStorage.bucket, // Pass bucket reference for direct access
});

// Add S3 permissions to the getDataset Lambda function
const getDatasetS3PolicyStatement = new iam.PolicyStatement({
  sid: "AllowS3ReadDatasets",
  actions: ["s3:GetObject", "s3:ListBucket", "s3:ListObjectsV2"],
  resources: [
    weatherStorage.bucket.bucketArn,
    `${weatherStorage.bucket.bucketArn}/*`,
  ],
});

getDatasetLambda.addToRolePolicy(getDatasetS3PolicyStatement);

// Add STS permissions to the getDataset Lambda function
const getDatasetSTSPolicyStatement = new iam.PolicyStatement({
  sid: "AllowSTSAccess",
  actions: ["sts:GetCallerIdentity"],
  resources: ["*"],
});

getDatasetLambda.addToRolePolicy(getDatasetSTSPolicyStatement);

// Create EventBridge construct for scheduled processing (using main stack)
const eventBridge = new CustomEventBridge(
  backend.stack,
  "WeatherDataProcessing",
  {
    accountId,
    region,
    crawlerName: weatherDataGlue.crawler.name!,
  }
);

backend.addOutput({
  custom: {
    addThingFunctionName: addThingLambda.functionName,
    addThingFunctionArn: addThingLambda.functionArn,
    fetchThingsFunctionName: fetchThingsLambda.functionName,
    fetchThingsFunctionArn: fetchThingsLambda.functionArn,
    deleteThingFunctionName: deleteThingLambda.functionName,
    deleteThingFunctionArn: deleteThingLambda.functionArn,
    getIoTEndpointFunctionName: getIoTEndpointLambda.functionName,
    getIoTEndpointFunctionArn: getIoTEndpointLambda.functionArn,
    getDatasetFunctionName: getDatasetLambda.functionName,
    getDatasetFunctionArn: getDatasetLambda.functionArn,
    // CDK Weather Dataset Storage (replaces Amplify storage)
    weatherDatasetBucketName: weatherStorage.bucket.bucketName,
    weatherDatasetBucketArn: weatherStorage.bucket.bucketArn,
    weatherDatasetBucketDomainName: weatherStorage.bucket.bucketDomainName,
    weatherDatasetBucketWebsiteUrl: weatherStorage.bucket.bucketWebsiteUrl,
    // Glue Data Processing Pipeline
    glueDatabaseName: weatherDataGlue.database.ref,
    glueCrawlerName: weatherDataGlue.crawler.name,
    glueJobName: weatherDataGlue.job.name,
    // EventBridge Scheduling
    stateMachineArn: eventBridge.stateMachine.stateMachineArn,
    eventBridgeRuleName: eventBridge.rule.ruleName,
    // Source bucket for raw data (hardcoded)
    sourceDataBucketName: "itea-weather-data-lake-storage",
    // CloudFront CDN for fast global delivery
    weatherCdnDomainName: cloudFrontCDN.domainName,
    weatherCdnDistributionId: cloudFrontCDN.distributionId,
  },
});
