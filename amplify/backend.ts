import { defineBackend } from "@aws-amplify/backend";
import * as iam from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";
import { addThing } from "./functions/addThing/resource";

export const backend = defineBackend({
  auth,
  addThing,
});

const addThingLambda = backend.addThing.resources.lambda;
const region = addThingLambda.stack.region;
const accountId = addThingLambda.stack.account;

// IoT permissions for the Lambda function itself
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

// STS permissions for the Lambda function
const stsPolicyStatement = new iam.PolicyStatement({
  sid: "AllowSTSAccess",
  actions: ["sts:GetCallerIdentity"],
  resources: ["*"],
});

addThingLambda.addToRolePolicy(iotPolicyStatement);
addThingLambda.addToRolePolicy(stsPolicyStatement);

// Grant authenticated users permission to invoke the Lambda function
const authenticatedRole = backend.auth.resources.authenticatedUserIamRole;
authenticatedRole.addToPrincipalPolicy(
  new iam.PolicyStatement({
    sid: "AllowLambdaInvoke",
    effect: iam.Effect.ALLOW,
    actions: ["lambda:InvokeFunction"],
    resources: [addThingLambda.functionArn],
  })
);

backend.addOutput({
  custom: {
    addThingFunctionName: addThingLambda.functionName,
    addThingFunctionArn: addThingLambda.functionArn,
  },
});
