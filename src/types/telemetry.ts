import React from "react";

export interface TelemetryContextType {
  // Weather card data
  weatherData: import("./sensorData").cardData | null;

  // Chart data
  windData: import("./sensorData").WindData[];
  rainData: import("./sensorData").RainData[];

  // Connection state
  error: Error | null;
  isLoading: boolean;
  isConnected: boolean;

  // Control methods
  refreshData: () => void;
  clearData: () => void;
}

export interface TelemetryProviderProps {
  children: React.ReactNode;
}
