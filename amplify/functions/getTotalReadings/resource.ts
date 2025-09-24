import { defineFunction } from "@aws-amplify/backend";

export const getTotalReadings = defineFunction({
  // Equivalent to amplify add function
  name: "getTotalReadings",
  entry: "./handler.ts",
  environment: {
    STORAGE_BUCKET_NAME: process.env.STORAGE_BUCKET_NAME || "",
  },
  runtime: 20,
  timeoutSeconds: 30,
});
