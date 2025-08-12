import { defineFunction } from "@aws-amplify/backend";

export const fetchThings = defineFunction({
  name: "fetchThings",
  entry: "./handler.ts",
  environment: {
    AWS_IOT_THING_GROUP_NAME: "ITeaWeatherHub",
  },
  timeoutSeconds: 30,
  memoryMB: 128,
  runtime: 20, // Node.js 20.x
});
