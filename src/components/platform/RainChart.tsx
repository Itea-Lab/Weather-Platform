"use client";

import { useIoT } from "@/hooks/useIoT";
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
  const { rainData, error, isLoading } = useIoT();

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, "HH:mm");
    } catch {
      return dateString;
    }
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
          <span className="text-sm text-gray-500">
            Live data from IoT sensors
          </span>
          {!isLoading && rainData.length > 0 && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          )}
        </div>
      </div>

      {rainData && rainData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={rainData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatDate}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              label={{
                value: "Rainfall (mm)",
                angle: -90,
                position: "insideLeft",
              }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              labelFormatter={(value) => `Time: ${formatDate(value)}`}
              formatter={(value: number, name: string) => [
                `${value.toFixed(2)} mm`,
                name === "rainFallbyHour"
                  ? "Hourly Rainfall"
                  : name === "rainFallbyDay"
                  ? "Daily Rainfall"
                  : name,
              ]}
            />
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
