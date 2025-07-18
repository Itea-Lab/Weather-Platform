// src/lib/amplifyClientConfig.ts
import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

// Configure Amplify for client-side with SSR support
const amplifyConfig = {
  ...outputs,
  // Enable SSR support for cookie-based auth
  ssr: true,
};

// Configure Amplify with SSR support for cookie-based authentication
Amplify.configure(amplifyConfig, {
  ssr: true,
});

export default amplifyConfig;
