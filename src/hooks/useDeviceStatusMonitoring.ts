import { useEffect } from "react";
import { deviceStatusMonitor } from "@/lib/deviceStatusMonitor";

// Global hook to manage device status monitoring lifecycle
export function useDeviceStatusMonitoring() {
  useEffect(() => {
    // Initialize the monitor when the app starts
    deviceStatusMonitor.initialize();

    // Cleanup when the app unmounts
    return () => {
      deviceStatusMonitor.destroy();
    };
  }, []);

  // Return monitor methods for external access if needed
  return {
    getDeviceStatuses: () => deviceStatusMonitor.getDeviceStatuses(),
    getDeviceStatus: (deviceId: string) =>
      deviceStatusMonitor.getDeviceStatus(deviceId),
  };
}
