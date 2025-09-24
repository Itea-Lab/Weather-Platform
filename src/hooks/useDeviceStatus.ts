"use client";

import { useState, useEffect } from "react";
import type { cardData } from "@/types/sensorData";
import {
  DeviceStatus,
  isDeviceDataStale,
  getDeviceStatus as getDeviceStatusUtil,
  formatTimeSinceUpdate,
  DEVICE_OFFLINE_THRESHOLD,
} from "@/lib/deviceStatusUtils";

export interface DeviceStatusMap {
  [deviceId: string]: DeviceStatus;
}

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
    return isDeviceDataStale(timestamp, currentTime);
  };

  const getDeviceStatus = (
    timestamp?: string | Date | number | null
  ): DeviceStatus => {
    return getDeviceStatusUtil(timestamp, currentTime);
  };

  const getTimeSinceUpdate = (
    timestamp?: string | Date | number | null
  ): string => {
    return formatTimeSinceUpdate(timestamp, currentTime);
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
    OFFLINE_THRESHOLD: DEVICE_OFFLINE_THRESHOLD,
  };
}
