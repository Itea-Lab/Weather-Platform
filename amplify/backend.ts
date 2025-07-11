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

const iotPolicyStatement = new iam.PolicyStatement({
  sid: "AllowIoTActions",
  actions: [
    "iot:CreateThing",
    "iot:AddThingToThingGroup",
    "iot:AttachThingPrincipal",
    "iot:AttachPolicy",
    "iot:DescribeThing",
    "iot:DescribeEndpoint", // Fetch IoT endpoint
    "iot:ListThingGroupsForThing",
    "iot:ListPrincipalPolicies",
  ],
  resources: [
    `arn:aws:iot:${region}:${accountId}:thing/*`,
    `arn:aws:iot:${region}:${accountId}:thinggroup/ITeaWeatherHub`,
    `arn:aws:iot:${region}:${accountId}:policy/WeatherStationPolicies`,
    `arn:aws:iot:${region}:${accountId}:cert/*`,
    "*", // DescribeEndpoint requires wildcard resource
  ],
});

// Add STS permissions to get account ID
const stsPolicyStatement = new iam.PolicyStatement({
    sid: "AllowSTSAccess",
    actions: [
      "sts:GetCallerIdentity", // Get account ID
    ],
    resources: ["*"],
});
  
addThingLambda.addToRolePolicy(iotPolicyStatement);
addThingLambda.addToRolePolicy(stsPolicyStatement);