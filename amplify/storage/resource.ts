import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "amplifyWeatherDataset",
  access: (allow) => ({
    // All files in the dataset folder can be read by authenticated users
    "dataset/*": [
      allow.authenticated.to(["read"]), // download = GetObject
    ],
    // Glue scripts folder - no direct user access needed, managed by Glue
    "glue-scripts/*": [
      // No user access rules - this will be managed by IAM policies for Glue
    ],
  }),
});
