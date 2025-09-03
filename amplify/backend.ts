import { defineBackend } from "@aws-amplify/backend";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { auth } from "./auth/resource";
import { addThing } from "./functions/addThing/resource";
import { fetchThings } from "./functions/fetchThings/resource";
import { deleteThing } from "./functions/deleteThing/resource";
import { getIoTEndpoint } from "./functions/getIoTEndpoint/resource";
import { storage } from "./storage/resource";
import { CustomWeatherDataGlue } from "./custom/WeatherDataGlue/resource";
import { CustomEventBridge } from "./custom/EventBridge/resource";
import { CustomCloudFront } from "./custom/CloudFront/resource";

export const backend = defineBackend({
  auth,
  addThing,
  fetchThings,
  deleteThing,
  getIoTEndpoint,
  storage,
});

const addThingLambda = backend.addThing.resources.lambda;
const fetchThingsLambda = backend.fetchThings.resources.lambda;
const deleteThingLambda = backend.deleteThing.resources.lambda;
const getIoTEndpointLambda = backend.getIoTEndpoint.resources.lambda;
const region = addThingLambda.stack.region;
const accountId = addThingLambda.stack.account;

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

// STS permissions for both Lambda functions
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

// Add AWS managed policies for IoT PubSub access
authenticatedRole.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName("AWSIoTDataAccess")
);
authenticatedRole.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName("AWSIoTConfigAccess")
);

// --- Cognito User Pool Group: platform-admin ---
const userPool = backend.auth.resources.userPool;
const platformAdminRoleArn = `arn:aws:iam::${accountId}:role/platform-admin`;
const platformAdminRole = iam.Role.fromRoleArn(
  backend.stack,
  "PlatformAdminRole",
  platformAdminRoleArn,
  { mutable: false }
);

const platformAdminGroup = new cognito.CfnUserPoolGroup(
  backend.stack,
  "PlatformAdminGroup",
  {
    groupName: "platform-admin",
    userPoolId: userPool.userPoolId,
    roleArn: platformAdminRole.roleArn,
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
    sourceBucketName: "itea-weather-data-lake-storage", // Source bucket with raw data
    targetBucketName: backend.storage.resources.bucket.bucketName, // Amplify storage for processed data
  }
);

// Create CloudFront CDN construct (uses CloudFormation template)
const cloudFrontCDN = new CustomCloudFront(backend.stack, "WeatherDatasetCDN", {
  storageBucketName: backend.storage.resources.bucket.bucketName,
  storageBucketDomainName: backend.storage.resources.bucket.bucketDomainName,
});

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
    glueDatabaseName: weatherDataGlue.database.ref,
    glueCrawlerName: weatherDataGlue.crawler.name,
    glueJobName: weatherDataGlue.job.name,
    stateMachineArn: eventBridge.stateMachine.stateMachineArn,
    eventBridgeRuleName: eventBridge.rule.ruleName,
    weatherCdnDomainName: cloudFrontCDN.domainName,
    weatherCdnDistributionId: cloudFrontCDN.distributionId,
  },
});
