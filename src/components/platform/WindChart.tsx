"use client";

import { useRealtimeWindData } from "@/hooks/useRealtimeChartData";
import {
  LineChart,
  XAxis,
  YAxis,
  Line,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

export default function WindChart() {
  const { windData, error, isLoading } = useRealtimeWindData();

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
        <div className="text-gray-500">Loading wind data...</div>
      </div>
    );
  }

  if (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load wind data";

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
        <h2 className="text-lg font-semibold">Wind Speed (Real-time)</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Live data from IoT sensors
          </span>
          {!isLoading && windData.length > 0 && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          )}
        </div>
      </div>

      {windData && windData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={windData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatDate}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              label={{
                value: "Wind Speed (m/s)",
                angle: -90,
                position: "insideLeft",
              }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip labelFormatter={(value) => `Time: ${formatDate(value)}`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="avgWindSpeed"
              name="Average Wind Speed"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="maxWindSpeed"
              name="Max Wind Speed"
              stroke="#82ca9d"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">No wind data available</div>
        </div>
      )}
    </div>
  );
}
