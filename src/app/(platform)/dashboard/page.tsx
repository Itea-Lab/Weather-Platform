"use client";

import WeatherCard from "@/components/platform/dashboard/DataCard";
import WindChart from "@/components/platform/dashboard/WindChart";
import RainChart from "@/components/platform/dashboard/RainChart";
import TopicSelector from "@/components/platform/TopicSelector";
import { useTelemetry } from "@/hooks/TelemetryContext";

export default function DashboardPage() {
  // Use global telemetry context instead of local hook
  const { weatherData, windData, rainData, error, isLoading, isConnected } =
    useTelemetry();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Weather Dashboard</h1>
        <TopicSelector />
      </div>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <WeatherCard
            title="Temperature"
            dataKey="temperature"
            unit="°C"
            icon="temperature"
            data={weatherData}
            error={error}
            isLoading={isLoading}
            isConnected={isConnected}
          />
          <WeatherCard
            title="Humidity"
            dataKey="humidity"
            unit="%"
            icon="humidity"
            data={weatherData}
            error={error}
            isLoading={isLoading}
            isConnected={isConnected}
          />
          <WeatherCard
            title="Pressure"
            dataKey="pressure"
            unit=" hPa"
            icon="barometric"
            data={weatherData}
            error={error}
            isLoading={isLoading}
            isConnected={isConnected}
          />
        </div>
      </section>
      {/* More dashboard content */}
      <section className="my-4">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/3 space-y-6">
            <WeatherCard
              title="Wind Speed"
              dataKey="avgWindSpeed"
              unit=" m/s"
              icon="windSpeed"
              data={weatherData}
              error={error}
              isLoading={isLoading}
              isConnected={isConnected}
            />
            <WeatherCard
              title="Wind Speed (Max)"
              dataKey="maxWindSpeed"
              unit=" m/s"
              icon="windSpeed"
              data={weatherData}
              error={error}
              isLoading={isLoading}
              isConnected={isConnected}
            />
            <WeatherCard
              title="Wind Direction"
              dataKey="windDirection"
              unit="°"
              icon="windDirection"
              data={weatherData}
              error={error}
              isLoading={isLoading}
              isConnected={isConnected}
            />
          </div>

          <div className="lg:w-2/3">
            <WindChart></WindChart>
          </div>
        </div>
      </section>
      <section className="">
        <RainChart></RainChart>
      </section>
    </div>
  );
}
