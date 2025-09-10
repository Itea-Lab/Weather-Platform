"use client";

import { useEffect } from "react";
import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

export default function PubSubInitializer() {
  useEffect(() => {
    // Configure Amplify
    const configureAmplify = async () => {
      try {
        // Configure Amplify - this includes PubSub configuration automatically
        Amplify.configure(outputs, {
          ssr: true,
        });

        console.log("✅ Amplify configured successfully");
      } catch (error) {
        console.error("❌ Failed to configure Amplify:", error);
      }
    };

    configureAmplify();
  }, []);

  return null; // This component doesn't render anything
}
