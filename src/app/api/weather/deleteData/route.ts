import { NextResponse } from "next/server";
import { withAuth } from "@/lib/amplifyAuth";

export async function POST(request: Request) {
  return withAuth(request, async (req: Request, { user }: { user: any }) => {
    try {
      const { timestamp } = await req.json();

      if (!timestamp) {
        return NextResponse.json(
          { error: "Timestamp is required" },
          { status: 400 }
        );
      }

      const url = `${process.env.INFLUXDB_ROUTE}/api/v2/delete`;
      const org = process.env.INFLUXDB_ORG;
      const bucket = process.env.INFLUXDB_BUCKET || "weather_data";

      // Convert timestamp to RFC3339 format and create a small time window
      const recordTime = new Date(timestamp);
      const startTime = new Date(recordTime.getTime() - 1000);
      const stopTime = new Date(recordTime.getTime() + 1000);

      const predicate = `_measurement="weather_sensor"`;

      const queryParams = new URLSearchParams({
        org: org || "",
        bucket: bucket,
      });

      console.log(`Deleting data with predicate: ${predicate}`);
      console.log(
        `Time range: ${startTime.toISOString()} to ${stopTime.toISOString()}`
      );

      // Make request to InfluxDB delete API
      const response = await fetch(`${url}?${queryParams.toString()}`, {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.INFLUXDB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start: startTime.toISOString(),
          stop: stopTime.toISOString(),
          predicate: predicate,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("InfluxDB delete error:", errorText);
        return NextResponse.json(
          { error: `Failed to delete data: ${errorText}` },
          { status: response.status }
        );
      }

      console.log("Data deleted successfully");
      return NextResponse.json({
        success: true,
        message: "Data deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting data:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { error: "Failed to delete data", details: errorMessage },
        { status: 500 }
      );
    }
  });
}