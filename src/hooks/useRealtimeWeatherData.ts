import { useState, useEffect, useCallback } from "react";
import { PubSub } from "@aws-amplify/pubsub";
import { cardData } from "@/types/sensorData";
import { getIoTConfig, getWeatherTopic } from "@/lib/iotConfig";

// Simplified weather message interface based on what you'll actually use
interface WeatherMessage {
  deviceId: string;
  timestamp: string;
  location?: string;
  data: {
    temperature: number;
    humidity: number;
    pressure: number;
    windDirection: number;
    avgWindSpeed: number;
    maxWindSpeed: number;
    rainfall1hr: number;
    rainfall24hr: number;
  };
}

export function useRealtimeWeatherData() {
  const [data, setData] = useState<cardData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const transformWeatherMessage = useCallback((payload: any): cardData => {
    // Handle the actual IoT message structure from your weather station
    return {
      id: Date.now(), // Use timestamp as ID
      timestamp: payload.timestamp,
      temperature: payload.data.temperature,
      humidity: payload.data.humidity,
      pressure: payload.data.pressure,
      avgWindSpeed: payload.data.avgWindSpeed,
      maxWindSpeed: payload.data.maxWindSpeed,
      windDirection: payload.data.windDirection,
    };
  }, []);

  useEffect(() => {
    let subscription: any = null;

    const setupRealtimeConnection = async () => {
      try {
        setError(null);
        setIsLoading(true);

        // Get IoT config
        const iotConfig = await getIoTConfig();
        const topic = getWeatherTopic();

        // Create PubSub client with IoT configuration
        const pubSubClient = new PubSub({
          region: iotConfig.region,
          endpoint: iotConfig.endpoint,
        });

        // Subscribe to the weather topic
        subscription = pubSubClient.subscribe({ topics: [topic] }).subscribe({
          next: (payload: any) => {
            // Process weather message
            try {
              // Use payload.value which contains the actual message data
              const messageData = payload.value || payload;
              const transformedData = transformWeatherMessage(messageData);
              setData(transformedData);
              setError(null);
              // Weather data updated successfully
            } catch (parseError) {
              console.error("❌ Error parsing IoT message:", parseError);
              setError(new Error("Failed to parse IoT message"));
            }
          },
          error: (err: any) => {
            console.error("❌ IoT subscription error:", err);
            setError(new Error(`IoT connection error: ${err.message}`));
            setIsConnected(false);
          },
          complete: () => {
            console.log("IoT subscription completed");
            setIsConnected(false);
          },
        });

        setIsConnected(true);
        setIsLoading(false);
        // Reduced logging: connection success
      } catch (err) {
        console.error("❌ Failed to setup real-time connection:", err);
        setError(
          new Error(
            `Failed to connect: ${
              err instanceof Error ? err.message : "Unknown error"
            }`
          )
        );
        setIsLoading(false);
        setIsConnected(false);
      }
    };

    setupRealtimeConnection();

    // Cleanup function
    return () => {
      if (subscription) {
        subscription.unsubscribe();
        console.log("Unsubscribed from real-time data");
      }
    };
  }, [transformWeatherMessage]);

  // Function to manually update data (for testing with real IoT data)
  const updateData = useCallback(
    (weatherMessage: WeatherMessage) => {
      console.log("Manually updating data:", weatherMessage);
      const transformedData = transformWeatherMessage(weatherMessage);
      setData(transformedData);
      setError(null);
    },
    [transformWeatherMessage]
  );

  return {
    data,
    error,
    isLoading,
    isConnected,
    updateData, // Exposed for testing
  };
}
