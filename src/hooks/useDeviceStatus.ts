import { useState, useEffect } from "react";
import { cardData } from "@/types/sensorData";

export interface DeviceStatus {
  isOnline: boolean;
  lastSeen: Date | null;
  secondsOffline: number;
}

export interface DeviceStatusMap {
  [deviceId: string]: DeviceStatus;
}

const OFFLINE_THRESHOLD = 3000; // 3 seconds

export function useDeviceStatus(data?: cardData | null) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const isDataStale = (timestamp?: string | Date | number | null): boolean => {
    if (!timestamp) return true;

    try {
      const dataTime = new Date(timestamp).getTime();
      const timeDiff = currentTime - dataTime;
      return timeDiff > OFFLINE_THRESHOLD;
    } catch {
      return true;
    }
  };

  const getDeviceStatus = (
    timestamp?: string | Date | number | null
  ): DeviceStatus => {
    if (!timestamp) {
      return {
        isOnline: false,
        lastSeen: null,
        secondsOffline: 0,
      };
    }

    try {
      const lastSeen = new Date(timestamp);
      const timeDiff = currentTime - lastSeen.getTime();
      const isOnline = timeDiff <= OFFLINE_THRESHOLD;
      const secondsOffline = isOnline ? 0 : Math.floor(timeDiff / 1000);

      return {
        isOnline,
        lastSeen,
        secondsOffline,
      };
    } catch {
      return {
        isOnline: false,
        lastSeen: null,
        secondsOffline: 0,
      };
    }
  };

  const getTimeSinceUpdate = (
    timestamp?: string | Date | number | null
  ): string => {
    if (!timestamp) return "Unknown";

    try {
      const dataTime = new Date(timestamp);
      const timeDiff = currentTime - dataTime.getTime();

      if (timeDiff > OFFLINE_THRESHOLD) {
        const secondsAgo = Math.floor(timeDiff / 1000);
        const minutesAgo = Math.floor(secondsAgo / 60);
        const hoursAgo = Math.floor(minutesAgo / 60);

        if (hoursAgo > 0) {
          return `${hoursAgo}h ${minutesAgo % 60}m ago`;
        } else if (minutesAgo > 0) {
          return `${minutesAgo}m ${secondsAgo % 60}s ago`;
        } else {
          return `${secondsAgo}s ago`;
        }
      }

      return dataTime.toLocaleTimeString();
    } catch {
      return "Invalid time";
    }
  };

  // For the current data (used in DataCard)
  const currentDeviceStatus = data
    ? getDeviceStatus(data.timestamp)
    : {
        isOnline: false,
        lastSeen: null,
        secondsOffline: 0,
      };

  return {
    isDataStale: (timestamp?: string | Date | number | null) =>
      isDataStale(timestamp || data?.timestamp),
    getDeviceStatus,
    getTimeSinceUpdate: (timestamp?: string | Date | number | null) =>
      getTimeSinceUpdate(timestamp || data?.timestamp),
    currentDeviceStatus,
    OFFLINE_THRESHOLD,
  };
}
