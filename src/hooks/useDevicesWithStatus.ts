import { useMemo } from "react";
import { useDevices } from "@/lib/api";
import { useDeviceStatus } from "@/hooks/useDeviceStatus";
import { deviceStatusMonitor } from "@/lib/deviceStatusMonitor";
import { Device } from "@/types/device";

export interface DeviceWithStatus extends Device {
  realTimeStatus: "online" | "offline";
  lastSeenRealTime: Date | null;
  timeSinceUpdate: string;
}

/**
 * Hook that combines API device data with real-time status monitoring
 * Handles device name parsing (raspi-1-weather-edge vs raspi-1)
 */
export function useDevicesWithStatus() {
  const { devices, isLoading, error, mutate, totalCount, thingGroup } =
    useDevices();
  const { getDeviceStatus, getTimeSinceUpdate } = useDeviceStatus();

  const devicesWithStatus = useMemo(() => {
    if (!devices) return [];

    return devices.map((device): DeviceWithStatus => {
      // Get real-time status from device monitoring
      const monitoringStatuses = deviceStatusMonitor.getDeviceStatuses();

      // Parse device name to match monitoring data
      // API returns: raspi-1, raspi-2, etc.
      // Monitoring uses: raspi-1-weather-edge, raspi-2-weather-edge, etc.
      const deviceIdForMonitoring = `${device.name}-weather-edge`;

      // Find matching monitoring status
      const monitoringStatus = monitoringStatuses.find(
        (status) =>
          status.deviceId === deviceIdForMonitoring ||
          status.deviceId === device.name
      );

      let realTimeStatus: "online" | "offline" = "offline";
      let lastSeenRealTime: Date | null = null;
      let timeSinceUpdate = "No data";

      if (monitoringStatus) {
        realTimeStatus = monitoringStatus.isOnline ? "online" : "offline";
        lastSeenRealTime = monitoringStatus.lastSeen;
        timeSinceUpdate = getTimeSinceUpdate(monitoringStatus.lastSeen);
      } else {
        // Fallback to API lastSeen data if no monitoring data
        if (device.lastSeen) {
          const deviceStatus = getDeviceStatus(device.lastSeen);
          realTimeStatus = deviceStatus.isOnline ? "online" : "offline";
          lastSeenRealTime = deviceStatus.lastSeen;
          timeSinceUpdate = getTimeSinceUpdate(device.lastSeen);
        }
      }

      return {
        ...device,
        realTimeStatus,
        lastSeenRealTime,
        timeSinceUpdate,
      };
    });
  }, [devices, getDeviceStatus, getTimeSinceUpdate]);

  return {
    devices: devicesWithStatus,
    isLoading,
    error,
    mutate,
    totalCount,
    thingGroup,
  };
}
