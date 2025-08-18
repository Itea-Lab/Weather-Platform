import WeatherCard from "@/components/platform/DataCard";
import WindChart from "@/components/platform/WindChart";
import RainChart from "@/components/platform/RainChart";

export const metadata = {
  title: "Overview",
  description: "Weather station overview dashboard",
};

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Weather Dashboard</h1>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <WeatherCard
            title="Temperature"
            dataKey="temperature"
            unit="°C"
            icon="temperature"
          />
          <WeatherCard
            title="Humidity"
            dataKey="humidity"
            unit="%"
            icon="humidity"
          />
          <WeatherCard
            title="Pressure"
            dataKey="pressure"
            unit=" hPa"
            icon="barometric"
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
            />
            <WeatherCard
              title="Wind Speed (Max)"
              dataKey="maxWindSpeed"
              unit=" m/s"
              icon="windSpeed"
            />
            <WeatherCard
              title="Wind Direction"
              dataKey="windDirection"
              unit="°"
              icon="windDirection"
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
