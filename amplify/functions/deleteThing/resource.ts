import { defineFunction } from "@aws-amplify/backend";

export const deleteThing = defineFunction({
  name: "delete-thing",
  entry: "./handler.ts",
  environment: {
    AWS_IOT_THING_GROUP_NAME: "ITeaWeatherHub",
    AWS_IOT_POLICY_NAME: "WeatherStationPolicies",
  },
  timeoutSeconds: 60, // Longer timeout for deletion operations
  memoryMB: 128,
  runtime: 20, // Node.js 20.x
});
