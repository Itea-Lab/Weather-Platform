// src/lib/amplifyServerConfig.ts
import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import outputs from "../../amplify_outputs.json";

// Create server runner for SSR operations
export const { runWithAmplifyServerContext } = createServerRunner({
  config: outputs,
});

export default outputs;
