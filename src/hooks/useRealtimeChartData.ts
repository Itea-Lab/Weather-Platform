import { useState, useEffect, useCallback } from "react";
import { PubSub } from "@aws-amplify/pubsub";
import { WindData, RainData } from "@/types/sensorData";
import { getIoTConfig, getWeatherTopic } from "@/lib/iotConfig";

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

export function useRealtimeWindData() {
  const [windData, setWindData] = useState<WindData[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const transformWindMessage = useCallback((payload: any): WindData => {
    return {
      id: Date.now(),
      timestamp: payload.timestamp,
      avgWindSpeed: payload.data.avgWindSpeed,
      maxWindSpeed: payload.data.maxWindSpeed,
      windDirection: payload.data.windDirection,
    };
  }, []);

  useEffect(() => {
    let subscription: any = null;

    const setupWindDataSubscription = async () => {
      try {
        setError(null);
        setIsLoading(true);

        // Get dynamic IoT configuration
        const iotConfig = await getIoTConfig();
        const topic = getWeatherTopic();

        // Create PubSub client
        const pubSubClient = new PubSub({
          region: iotConfig.region,
          endpoint: iotConfig.endpoint,
        });

        // Subscribe to the weather topic for wind data
        subscription = pubSubClient.subscribe({ topics: [topic] }).subscribe({
          next: (payload: any) => {
            // Process wind data
            try {
              const messageData = payload.value || payload;
              const newWindData = transformWindMessage(messageData);
              setWindData((prev) => {
                const updated = [...prev, newWindData].slice(-20); // Keep last 20 points
                console.log("Wind data updated:", updated.length, "points");
                return updated;
              });
              setError(null);
            } catch (parseError) {
              console.error("❌ Error parsing wind data:", parseError);
              setError(new Error("Failed to parse wind data"));
            }
          },
          error: (err: any) => {
            console.error("❌ Wind data subscription error:", err);
            setError(new Error(`Wind data connection error: ${err.message}`));
          },
        });

        setIsLoading(false);
        // Wind data subscription ready
      } catch (err) {
        console.error("❌ Failed to setup wind data subscription:", err);
        setError(new Error("Failed to connect to wind data stream"));
        setIsLoading(false);
      }
    };

    setupWindDataSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [transformWindMessage]);

  // Function to manually add wind data (called from main weather hook)
  const addWindData = useCallback(
    (weatherMessage: WeatherMessage) => {
      const newWindData = transformWindMessage(weatherMessage);
      setWindData((prev) => {
        const updated = [...prev, newWindData].slice(-20); // Keep last 20 points
        console.log("Wind data updated:", updated.length, "points");
        return updated;
      });
    },
    [transformWindMessage]
  );

  return {
    windData,
    error,
    isLoading,
    addWindData, // Expose function for manual updates
  };
}

export function useRealtimeRainData() {
  const [rainData, setRainData] = useState<RainData[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const transformRainMessage = useCallback((payload: any): RainData => {
    return {
      id: Date.now(),
      timestamp: payload.timestamp,
      rainFallbyHour: payload.data.rainfall1hr,
      rainFallbyDay: payload.data.rainfall24hr,
    };
  }, []);

  useEffect(() => {
    let subscription: any = null;

    const setupRainDataSubscription = async () => {
      try {
        setError(null);
        setIsLoading(true);

        // Get dynamic IoT configuration
        const iotConfig = await getIoTConfig();
        const topic = getWeatherTopic();

        // Create PubSub client
        const pubSubClient = new PubSub({
          region: iotConfig.region,
          endpoint: iotConfig.endpoint,
        });

        // Subscribe to the weather topic for rain data
        subscription = pubSubClient.subscribe({ topics: [topic] }).subscribe({
          next: (payload: any) => {
            // Process rain data
            try {
              const messageData = payload.value || payload;
              const newRainData = transformRainMessage(messageData);
              setRainData((prev) => {
                const updated = [...prev, newRainData].slice(-24); // Keep last 24 hours
                console.log("Rain data updated:", updated.length, "points");
                return updated;
              });
              setError(null);
            } catch (parseError) {
              console.error("❌ Error parsing rain data:", parseError);
              setError(new Error("Failed to parse rain data"));
            }
          },
          error: (err: any) => {
            console.error("❌ Rain data subscription error:", err);
            setError(new Error(`Rain data connection error: ${err.message}`));
          },
        });

        setIsLoading(false);
        // Rain data subscription ready
      } catch (err) {
        console.error("❌ Failed to setup rain data subscription:", err);
        setError(new Error("Failed to connect to rain data stream"));
        setIsLoading(false);
      }
    };

    setupRainDataSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [transformRainMessage]);

  // Function to manually add rain data (called from main weather hook)
  const addRainData = useCallback(
    (weatherMessage: WeatherMessage) => {
      const newRainData = transformRainMessage(weatherMessage);
      setRainData((prev) => {
        const updated = [...prev, newRainData].slice(-24); // Keep last 24 hours
        console.log("Rain data updated:", updated.length, "points");
        return updated;
      });
    },
    [transformRainMessage]
  );

  return {
    rainData,
    error,
    isLoading,
    addRainData, // Expose function for manual updates
  };
}
