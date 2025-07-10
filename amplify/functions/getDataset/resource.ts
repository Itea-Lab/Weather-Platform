import { defineFunction } from "@aws-amplify/backend";

export const getDataset = defineFunction({
  name: "get-dataset",
  entry: "./handler.ts",
});
