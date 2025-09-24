import { defineAuth } from "@aws-amplify/backend";

export const auth = defineAuth({
  name: "weatherAuth",
  loginWith: { email: true },
});
