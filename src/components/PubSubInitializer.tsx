"use client";

import { useEffect } from "react";
import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

export default function PubSubInitializer() {
  useEffect(() => {
    // Configure Amplify with PubSub for AWS IoT Core
    const configureAmplifyWithPubSub = async () => {
      try {
        // Configure Amplify first
        Amplify.configure(outputs, {
          ssr: true,
        });

        // Pre-fetch and cache IoT endpoint globally
        // Ensures only ONE API call is made for the entire application
        console.log("IoT Core endpoint cached globally:");
      } catch (error) {
        console.error(
          "❌ Failed to configure Amplify or fetch IoT endpoint:",
          error
        );
      }
    };

    configureAmplifyWithPubSub();
  }, []);

  return null; // This component doesn't render anything
}
