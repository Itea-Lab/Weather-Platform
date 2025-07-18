import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/influxdb";
import { Dataset } from "@/types/dataset";

// GET handler for the /api/auth endpoint
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("range") || "-30d";
    const sortOrder =
      searchParams.get("sortOrder") || searchParams.get("sort") || "desc";
    const isDescending = sortOrder.toLowerCase() === "desc";
    const bucket = process.env.INFLUXDB_BUCKET;

    const query = `
      from(bucket: "${bucket}")
        |> range(start: ${timeRange})
        |> filter(fn: (r) => r._measurement == "weather_sensor")
        |> filter(fn: (r) => r._field == "temperature" or r._field == "humidity" or r._field == "pressure" or r._field == "avgWindSpeed" or r._field == "maxWindSpeed" or r._field == "windDirection" or r._field == "rainFallbyDay" or r._field == "rainFallbyHour")
        |> pivot(rowKey:["_time", "location"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"], desc: ${isDescending})
    `;

    const result = await executeQuery(query);

    // Format the response to match Dataset interface
    const data = (result as Dataset[]).map((row, index: number) => {
      // Format data
      const round = (value: number) =>
        Number(parseFloat(String(value || 0)).toFixed(1));
      return {
        id: index + 1,
        _time: row._time,
        location: row.location || "unknown",
        temperature: round(row.temperature),
        humidity: round(row.humidity),
        pressure: round(row.pressure),
        avgWindSpeed: round(row.avgWindSpeed),
        maxWindSpeed: round(row.maxWindSpeed),
        windDirection: round(row.windDirection),
        rainFallbyDay: round(row.rainFallbyDay),
        rainFallbyHour: round(row.rainFallbyHour),
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching datasets:", error);
    return NextResponse.json(
      { error: "Failed to fetch datasets" },
      { status: 500 }
    );
  }
}
