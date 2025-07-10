import { defineFunction } from "@aws-amplify/backend";

export const addThing = defineFunction({
  name: "add-thing",
  entry: "./handler.ts",
});
