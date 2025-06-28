import useSWR from "swr";
import { cardData, WindData, RainData } from "@/types/sensorData";
import { Dataset } from "@/types/dataset";
import { fetchAuthSession } from "aws-amplify/auth";

const fetcher = async (url: string) => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: res.statusText }));
      const error = new Error(errorData.error || "API request failed");
      (error as any).status = res.status;
      throw error;
    }

    return await res.json();
  } catch (error) {
    throw error;
  }
};

export function useLatestWeatherData() {
  const { data, error, isLoading } = useSWR<cardData>(
    "/api/weather/latest",
    fetcher,
    { refreshInterval: 30000 }
  );

  return {
    data,
    error: error
      ? error instanceof Error
        ? error
        : new Error(String(error))
      : null,
    isLoading,
  };
}

export function useWindData(timeRange: string = "-24h") {
  const { data, error, isLoading } = useSWR<WindData[]>(
    `/api/weather/wind?range=${timeRange}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  return {
    windData: data,
    error: error
      ? error instanceof Error
        ? error
        : new Error(String(error))
      : null,
    isLoading,
  };
}

export function useRainData(timeRange: string = "-24h") {
  const { data, error, isLoading } = useSWR<RainData[]>(
    `/api/weather/rain?range=${timeRange}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  return {
    rainData: data,
    error: error
      ? error instanceof Error
        ? error
        : new Error(String(error))
      : null,
    isLoading,
  };
}

export function useDatasetData(
  filters: {
    search?: string;
    sortOrder?: "asc" | "desc";
    range?: string;
  } = {}
) {
  const { search = "", sortOrder = "desc", range = "-30d" } = filters;

  // Build URL with query params
  const queryString = new URLSearchParams();
  if (sortOrder) queryString.append("sortOrder", sortOrder);
  if (search) queryString.append("search", search);
  if (range) queryString.append("range", range);

  const url = `/api/weather/dataset?${queryString.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<Dataset[]>(url, fetcher, {
    refreshInterval: 30000,
    fallbackData: [],
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      // Don't retry on 404s or bad data format errors
      if (
        error.status === 404 ||
        error.message.includes("Invalid data format") ||
        retryCount >= 3
      )
        return;

      // Retry after 5 seconds
      setTimeout(() => revalidate({ retryCount }), 5000);
    },
  });

  return {
    datasets: Array.isArray(data) ? data : [],
    error,
    isLoading,
    mutate,
  };
}

export async function deleteDatapoint(timestamp: any) {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();

    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch("/api/weather/deleteData", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ timestamp }),
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete data");
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting datapoint:", error);
    throw error;
  }
}
