import { useState, useEffect, useCallback, useMemo } from "react";
import { PubSub } from "@aws-amplify/pubsub";
import { cardData, WindData, RainData } from "@/types/sensorData";
import { getIoTConfig, getWeatherTopic } from "@/lib/iotConfig";
import { useTopicContext } from "@/hooks/TopicContext";

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

// Centralized IoT hook for all weather data (cards and charts)
export function useIoT() {
  const { selectedTopic } = useTopicContext();

  // Weather card data
  const [weatherData, setWeatherData] = useState<cardData | null>(null);

  // Chart data
  const [windData, setWindData] = useState<WindData[]>([]);
  const [rainData, setRainData] = useState<RainData[]>([]);

  // Connection state
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Memoize topic to prevent recalculation
  const weatherTopic = useMemo(() => {
    if (!selectedTopic) return null;
    return getWeatherTopic(selectedTopic);
  }, [selectedTopic]);

  const transformMessage = useCallback((payload: any) => {
    const rawTemp = payload.data?.temperature;
    const rawHumidity = payload.data?.humidity;
    const rawPressure = payload.data?.pressure;
    const rawAvgWind = payload.data?.avgWindSpeed;
    const rawMaxWind = payload.data?.maxWindSpeed;
    const rawWindDir = payload.data?.windDirection;
    const rawRain1hr = payload.data?.rainfall1hr;
    const rawRain24hr = payload.data?.rainfall24hr;

    const weatherCardData: cardData = {
      id: Date.now(),
      timestamp: payload.timestamp,
      temperature: typeof rawTemp === "number" ? rawTemp : 0,
      humidity: typeof rawHumidity === "number" ? rawHumidity : 0,
      pressure: typeof rawPressure === "number" ? rawPressure : 0,
      avgWindSpeed: typeof rawAvgWind === "number" ? rawAvgWind : 0,
      maxWindSpeed: typeof rawMaxWind === "number" ? rawMaxWind : 0,
      windDirection: typeof rawWindDir === "number" ? rawWindDir : 0,
    };

    const windChartData: WindData = {
      id: Date.now() + 1,
      timestamp: payload.timestamp,
      avgWindSpeed: typeof rawAvgWind === "number" ? rawAvgWind : 0,
      maxWindSpeed: typeof rawMaxWind === "number" ? rawMaxWind : 0,
      windDirection: typeof rawWindDir === "number" ? rawWindDir : 0,
    };

    const rainChartData: RainData = {
      id: Date.now() + 2,
      timestamp: payload.timestamp,
      rainFallbyHour: typeof rawRain1hr === "number" ? rawRain1hr : 0,
      rainFallbyDay: typeof rawRain24hr === "number" ? rawRain24hr : 0,
    };

    return { weatherCardData, windChartData, rainChartData };
  }, []);

  useEffect(() => {
    let subscription: any = null;

    const setupSingleIoTConnection = async () => {
      try {
        console.info("[IoT] Starting connection...");
        setError(null);
        setIsLoading(true);

        if (!selectedTopic || !weatherTopic) {
          console.warn("[IoT] No topic selected", {
            selectedTopic,
            weatherTopic,
          });
          setIsLoading(false);
          return;
        }

        console.info("[IoT] Connecting to topic:", weatherTopic);

        // Get IoT config with selected topic and credentials (cached)
        const iotConfig = await getIoTConfig(selectedTopic);
        console.debug("[IoT] Config fetched", {
          region: iotConfig.region,
          endpoint: iotConfig.endpoint,
        });

        // Initialize PubSub instance
        const pubsub = new PubSub({
          region: iotConfig.region,
          endpoint: iotConfig.endpoint,
          credentials: iotConfig.credentials,
        });

        console.info("[IoT] Subscribing to topic", weatherTopic);

        // Single subscription for all data
        subscription = pubsub.subscribe({ topics: [weatherTopic] }).subscribe({
          next: (payload: any) => {
            try {
              const messageData = payload.value || payload;
              console.debug("[IoT] Message received", {
                deviceId: messageData?.deviceId,
                timestamp: messageData?.timestamp,
              });

              const { weatherCardData, windChartData, rainChartData } =
                transformMessage(messageData);

              // Update all data states
              setWeatherData(weatherCardData);
              setWindData((prev) => [...prev, windChartData].slice(-20));
              setRainData((prev) => [...prev, rainChartData].slice(-24));

              setError(null);
              setIsLoading(false);
            } catch (parseError) {
              console.error("[IoT] Error parsing message", parseError);
              setError(new Error("Failed to parse IoT message"));
            }
          },
          error: (err: any) => {
            console.error("[IoT] Subscription error", err);
            setError(new Error(`IoT connection error: ${err?.message || err}`));
            setIsConnected(false);
          },
          complete: () => {
            console.info("[IoT] Subscription completed");
            setIsConnected(false);
          },
        });

        setIsConnected(true);
        setIsLoading(false);
        console.info("[IoT] Connected to topic", weatherTopic);
      } catch (err) {
        console.error("[IoT] Failed to setup connection", err);
        setError(
          new Error(
            `Failed to connect: ${
              err instanceof Error ? err.message : String(err)
            }`
          )
        );
        setIsLoading(false);
        setIsConnected(false);
      }
    };

    setupSingleIoTConnection();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
        console.log("[IoT] Unsubscribed from topic");
      }
    };
  }, [transformMessage, weatherTopic]);

  return {
    // Weather card data - compatible with useRealtimeWeatherData
    data: weatherData,
    weatherData,

    // Chart data - compatible with chart hooks
    windData,
    rainData,

    // Connection state
    error,
    isLoading,
    isConnected,
  };
}

// Legacy compatibility exports (will be removed)
export const useRealtimeWeatherData = () => {
  const { data, error, isLoading, isConnected } = useIoT();
  return { data, error, isLoading, isConnected };
};

export const useRealtimeWindData = () => {
  const { windData, error, isLoading } = useIoT();
  return { windData, error, isLoading };
};

export const useRealtimeRainData = () => {
  const { rainData, error, isLoading } = useIoT();
  return { rainData, error, isLoading };
};
