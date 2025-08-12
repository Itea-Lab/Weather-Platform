import useSWR from "swr";
import { cardData, WindData, RainData } from "@/types/sensorData";
import { Dataset } from "@/types/dataset";
import {
  DeviceRegistrationData,
  DeviceRegistrationResponse,
  DeviceListResponse,
} from "@/types/device";

// For GET requests only
const fetcher = async (url: string) => {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    const res = await fetch(url, {
      headers,
      credentials: "include", // This sends cookies automatically
    });

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ error: res.statusText }));
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
    const response = await fetch("/api/weather/deleteData", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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

export async function registerDevice(
  deviceData: DeviceRegistrationData
): Promise<DeviceRegistrationResponse> {
  try {
    const response = await fetch("/api/iot/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(deviceData),
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: response.statusText,
        details: `HTTP ${response.status} error occurred`,
      }));

      // Throw an error with more detailed information
      throw new Error(
        errorData.error ||
          (errorData.details
            ? `${response.statusText}: ${errorData.details}`
            : "Failed to register device")
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error registering device:", error);
    throw error;
  }
}

export async function deleteDevice(
  deviceName: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("/api/iot/deleteThing", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deviceName }),
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: response.statusText,
        details: `HTTP ${response.status} error occurred`,
      }));

      // Throw an error with more detailed information
      throw new Error(
        errorData.error ||
          (errorData.details
            ? `${response.statusText}: ${errorData.details}`
            : "Failed to delete device")
      );
    }

    const result = await response.json();
    return {
      success: true,
      message: result.message || `Device ${deviceName} deleted successfully`,
    };
  } catch (error) {
    console.error("Error deleting device:", error);
    throw error;
  }
}

// Hook to fetch devices from AWS IoT Core
export function useDevices() {
  const { data, error, isLoading, mutate } = useSWR<DeviceListResponse>(
    "/api/iot/fetchThings",
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      fallbackData: {
        success: true,
        message: "Loading devices...",
        devices: [],
        thingGroup: "ITeaWeatherHub",
        totalCount: 0,
        fetchedAt: new Date().toISOString(),
        fetchedBy: "",
      },
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Don't retry on 404s or auth errors
        if (error.status === 404 || error.status === 401 || retryCount >= 3)
          return;

        // Retry after 5 seconds
        setTimeout(() => revalidate({ retryCount }), 5000);
      },
    }
  );

  return {
    devices: data?.devices || [],
    totalCount: data?.totalCount || 0,
    thingGroup: data?.thingGroup || "ITeaWeatherHub",
    error: error
      ? error instanceof Error
        ? error
        : new Error(String(error))
      : null,
    isLoading,
    mutate, // For manual refresh
  };
}
