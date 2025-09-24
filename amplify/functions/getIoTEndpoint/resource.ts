import { defineFunction } from "@aws-amplify/backend";

export const getIoTEndpoint = defineFunction({
  name: "getIoTEndpoint",
  entry: "./handler.ts",
  runtime: 20,
  timeoutSeconds: 30,
});
