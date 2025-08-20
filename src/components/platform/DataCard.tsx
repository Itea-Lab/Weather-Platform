"use client";

import { format } from "date-fns";
import { cardData } from "@/types/sensorData";
import {
  Thermometer,
  Droplets,
  Gauge,
  ChartNoAxesCombined,
  Wind,
  Compass,
  Wifi,
  WifiOff,
} from "lucide-react";

interface WeatherCardProps {
  title: string;
  dataKey: keyof cardData;
  unit: string;
  icon?: string;
  data?: cardData | null;
  error?: Error | null;
  isLoading?: boolean;
  isConnected?: boolean;
}

export default function WeatherCard({
  title,
  dataKey,
  unit,
  icon,
  data,
  error,
  isLoading,
  isConnected,
}: WeatherCardProps) {
  const getIcon = () => {
    switch (icon) {
      case "temperature":
        return <Thermometer />;
      case "humidity":
        return <Droplets />;
      case "barometric":
        return <Gauge />;
      case "windSpeed":
        return <Wind />;
      case "windDirection":
        return <Compass />;
      default:
        return <ChartNoAxesCombined />;
    }
  };

  const getValue = () => {
    if (isLoading)
      return (
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
      );
    if (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return <span className="ml-2 text-xs text-red-400">({errorMsg})</span>;
    }
    if (!data) return "N/A";

    const value = data[dataKey];
    if (typeof value === "number") {
      return value.toFixed(1) + unit;
    }
    return value;
  };

  const getUpdateTime = () => {
    if (!data || !data.timestamp) return "Unknown";
    try {
      return format(new Date(data.timestamp), "HH:mm:ss");
    } catch {
      return "Invalid time";
    }
  };

  const getErrorMessage = () => {
    if (!error) return null;

    // Safely extract error message
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
        ? error
        : "Unknown error";

    return <p className="text-xs text-red-500">{message}</p>;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            {/* Connection status indicator */}
            {isConnected ? (
              <div title="Real-time connected">
                <Wifi className="w-4 h-4 text-green-500" />
              </div>
            ) : (
              <div title="Disconnected">
                <WifiOff className="w-4 h-4 text-red-500" />
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {isConnected
              ? `Last update: ${getUpdateTime()}`
              : "Waiting for connection..."}
          </p>
          {error && getErrorMessage()}
        </div>
        <div className="text-2xl">{getIcon()}</div>
      </div>
      <div className="mt-2 text-3xl font-semibold text-gray-900">
        {getValue()}
      </div>
      {isConnected && !isLoading && (
        <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Online
        </div>
      )}
    </div>
  );
}
