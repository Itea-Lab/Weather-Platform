"use client";

import { useState, useEffect, useMemo } from "react";
import { useTelemetry } from "@/hooks/TelemetryContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

export default function RainChart() {
  const { rainData, error, isLoading } = useTelemetry();
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second for real-time status indicators
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Simple date formatting function (no need to memoize for simple operations)
  const formatDate = (dateString: string | number) => {
    try {
      const date = parseISO(String(dateString));
      return format(date, "HH:mm");
    } catch {
      return String(dateString);
    }
  };

  // Only memoize expensive chart data transformation
  const chartData = useMemo(() => {
    if (!rainData || rainData.length === 0) return [];

    return rainData.map((item) => ({
      ...item,
      formattedTime: formatDate(item.timestamp),
    }));
  }, [rainData]);

  // Real-time status calculation using useState + useEffect pattern
  const statusInfo = useMemo(() => {
    if (!rainData || rainData.length === 0) {
      return { statusText: "", isStale: false, showIndicator: false };
    }

    const latestData = rainData[rainData.length - 1];
    const dataTime = new Date(latestData.timestamp).getTime();
    const timeDiff = currentTime - dataTime;
    const isStale = timeDiff > 3000;

    return {
      statusText: isStale
        ? "Last data from IoT sensors"
        : "Live data from IoT sensors",
      isStale,
      showIndicator: true,
    };
  }, [rainData, currentTime]);

  // Simple tooltip component (inline since it's not complex)
  const TooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow">
          <p className="font-semibold">{`Time: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-blue-600">
              {`${entry.dataKey}: ${entry.value} mm`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 h-80 flex items-center justify-center">
        <div className="text-gray-500">Loading rainfall data...</div>
      </div>
    );
  }

  if (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load rainfall data";

    return (
      <div className="bg-white shadow-md rounded-lg p-6 h-80 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-2">Error: {errorMessage}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Rainfall Live Data</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">{statusInfo.statusText}</span>
          {!isLoading &&
            statusInfo.showIndicator &&
            (statusInfo.isStale ? (
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            ) : (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            ))}
        </div>
      </div>

      {chartData && chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="formattedTime" tick={{ fontSize: 12 }} />
            <YAxis
              label={{
                value: "Rainfall (mm)",
                angle: -90,
                position: "insideLeft",
              }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<TooltipContent />} />
            <Legend />
            <Bar
              dataKey="rainFallbyHour"
              name="Hourly Rainfall"
              fill="#3b82f6"
            />
            <Bar dataKey="rainFallbyDay" name="Daily Rainfall" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">No rainfall data available</div>
        </div>
      )}
    </div>
  );
}
