import { defineBackend } from "@aws-amplify/backend";
import * as iam from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";
import { addThing } from "./functions/addThing/resource";
import { fetchThings } from "./functions/fetchThings/resource";
import { deleteThing } from "./functions/deleteThing/resource";
import { getIoTEndpoint } from "./functions/getIoTEndpoint/resource";

export const backend = defineBackend({
  auth,
  addThing,
  fetchThings,
  deleteThing,
  getIoTEndpoint,
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
backend.auth.resources.authenticatedUserIamRole.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName("AWSIoTDataAccess")
);
backend.auth.resources.authenticatedUserIamRole.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName("AWSIoTConfigAccess")
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
  },
});
