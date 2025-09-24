"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type {
  cardData,
  WindData,
  RainData,
  TelemetryPayload,
} from "@/types/sensorData";
import type {
  TelemetryContextType,
  TelemetryProviderProps,
} from "@/types/telemetry";
import { getWeatherTopic } from "@/lib/iotConfig";
import { useTopicContext } from "@/hooks/TopicContext";
import { deviceStatusMonitor } from "@/lib/deviceStatusMonitor";
import { sharedPubSubManager } from "@/lib/sharedPubSubManager";

const TelemetryContext = createContext<TelemetryContextType | undefined>(
  undefined
);

export function TelemetryProvider({ children }: TelemetryProviderProps) {
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

  const transformMessage = useCallback(
    (payload: TelemetryPayload) => {
      const rawTemp = payload.data?.temperature;
      const rawHumidity = payload.data?.humidity;
      const rawPressure = payload.data?.pressure;
      const rawAvgWind = payload.data?.avgWindSpeed;
      const rawMaxWind = payload.data?.maxWindSpeed;
      const rawWindDir = payload.data?.windDirection;
      const rawRain1hr = payload.data?.rainfall1hr;
      const rawRain24hr = payload.data?.rainfall24hr;

      // Transform and validate the data according to correct types
      const transformedData: cardData = {
        id: Date.now(),
        timestamp: payload.timestamp || new Date().toISOString(),
        temperature: typeof rawTemp === "number" ? rawTemp : 0,
        humidity: typeof rawHumidity === "number" ? rawHumidity : 0,
        pressure: typeof rawPressure === "number" ? rawPressure : 0,
        avgWindSpeed: typeof rawAvgWind === "number" ? rawAvgWind : 0,
        maxWindSpeed: typeof rawMaxWind === "number" ? rawMaxWind : 0,
        windDirection: typeof rawWindDir === "number" ? rawWindDir : 0,
        rainfall1hr: typeof rawRain1hr === "number" ? rawRain1hr : undefined,
        rainfall24hr: typeof rawRain24hr === "number" ? rawRain24hr : undefined,
      };

      // Update weather card data
      setWeatherData(transformedData);

      // Update wind chart data
      if (
        typeof rawAvgWind === "number" &&
        typeof rawMaxWind === "number" &&
        typeof rawWindDir === "number"
      ) {
        const windEntry: WindData = {
          id: Date.now() + 1,
          timestamp: payload.timestamp || new Date().toISOString(),
          avgWindSpeed: rawAvgWind,
          maxWindSpeed: rawMaxWind,
          windDirection: rawWindDir,
        };

        setWindData((prev) => [...prev.slice(-29), windEntry]); // Keep last 30 entries
      }

      // Update rain chart data
      if (typeof rawRain1hr === "number" && typeof rawRain24hr === "number") {
        const rainEntry: RainData = {
          id: Date.now() + 2,
          timestamp: payload.timestamp || new Date().toISOString(),
          rainFallbyHour: rawRain1hr,
          rainFallbyDay: rawRain24hr,
        };

        setRainData((prev) => [...prev.slice(-29), rainEntry]); // Keep last 30 entries
      }

      // Update device status monitoring
      if (payload?.deviceId && payload?.timestamp) {
        const district = selectedTopic || "unknown";
        deviceStatusMonitor.recordDeviceActivity(
          payload.deviceId,
          district,
          payload.timestamp
        );
      }
    },
    [selectedTopic]
  );

  // Refresh data (clear and reset)
  const refreshData = useCallback(() => {
    setWeatherData(null);
    setWindData([]);
    setRainData([]);
    setError(null);
    setIsLoading(true);
  }, []);

  // Clear all data
  const clearData = useCallback(() => {
    setWeatherData(null);
    setWindData([]);
    setRainData([]);
  }, []);

  useEffect(() => {
    let subscriptionKey: string | null = null;

    const subscribeToTelemetry = async () => {
      if (!weatherTopic) {
        setError(new Error("No topic selected"));
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Use shared PubSub manager for telemetry subscription
        subscriptionKey = await sharedPubSubManager.subscribe(
          [weatherTopic],
          (data: unknown) => {
            try {
              const payload = (data as { value?: unknown })?.value || data;
              if (
                payload &&
                typeof payload === "object" &&
                payload !== null &&
                "data" in payload
              ) {
                transformMessage(payload as TelemetryPayload);
                setIsConnected(true);
                setIsLoading(false);
              }
            } catch (err) {
              //   console.error(
              //     "[TelemetryContext] Error processing message:",
              //     err
              //   );
              setError(
                err instanceof Error
                  ? err
                  : new Error("Failed to process telemetry data")
              );
            }
          }
        );

        setIsConnected(true);
        setIsLoading(false);
      } catch (err) {
        // console.error("[TelemetryContext] Failed to subscribe:", err);
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to initialize telemetry subscription")
        );
        setIsConnected(false);
        setIsLoading(false);
      }
    };

    subscribeToTelemetry();

    // Cleanup function
    return () => {
      if (subscriptionKey) {
        console.log("[TelemetryContext] Unsubscribing from telemetry");
        sharedPubSubManager.unsubscribe(subscriptionKey);
      }
    };
  }, [weatherTopic, transformMessage]);

  const value: TelemetryContextType = {
    weatherData,
    windData,
    rainData,
    error,
    isLoading,
    isConnected,
    refreshData,
    clearData,
  };

  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry(): TelemetryContextType {
  const context = useContext(TelemetryContext);
  if (context === undefined) {
    throw new Error("useTelemetry must be used within a TelemetryProvider");
  }
  return context;
}
