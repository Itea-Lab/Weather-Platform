import { defineFunction } from "@aws-amplify/backend";

export const getDataset = defineFunction({
  name: "get-dataset",
  entry: "./handler.ts",
  timeoutSeconds: 60, // Increased for S3 operations
  memoryMB: 256, // Increased for processing multiple datasets
  runtime: 20, // Node.js 20.x
  resourceGroupName: "custom", // Use custom stack to avoid circular dependency
  environment: {
    // These will be overridden by backend.ts
    STORAGE_BUCKET_NAME: "",
    CLOUDFRONT_DOMAIN: "",
  },
});
