"use client";

import { useState, useEffect } from "react";
import { deviceStatusMonitor } from "@/lib/deviceStatusMonitor";
import { format } from "date-fns";
import { Wifi, WifiOff, Activity } from "lucide-react";

export default function DeviceMonitoringStatus() {
  const [deviceStatuses, setDeviceStatuses] = useState<
    Array<{
      deviceId: string;
      district: string;
      lastSeen: Date;
      isOnline: boolean;
      offlineNotificationSent: boolean;
    }>
  >([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateStatuses = () => {
      setDeviceStatuses(deviceStatusMonitor.getDeviceStatuses());
    };

    // Update statuses every second
    const interval = setInterval(updateStatuses, 1000);
    updateStatuses(); // Initial load

    return () => clearInterval(interval);
  }, []);

  if (deviceStatuses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <Activity className="w-4 h-4" />
          <span className="text-sm">No devices monitored yet</span>
        </div>
      </div>
    );
  }

  const onlineDevices = deviceStatuses.filter((d) => d.isOnline).length;
  const offlineDevices = deviceStatuses.length - onlineDevices;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          <span className="font-medium">Device Monitoring</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-green-600">
            <Wifi className="w-3 h-3" />
            {onlineDevices} online
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <WifiOff className="w-3 h-3" />
            {offlineDevices} offline
          </span>
          <span className="text-xs text-gray-400">
            {isExpanded ? "▼" : "▶"}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-2">
          {deviceStatuses.map((device) => {
            const timeSinceLastSeen = Date.now() - device.lastSeen.getTime();
            const secondsAgo = Math.floor(timeSinceLastSeen / 1000);

            return (
              <div
                key={device.deviceId}
                className={`flex items-center justify-between p-2 rounded ${
                  device.isOnline ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {device.isOnline ? (
                    <Wifi className="w-3 h-3 text-green-500" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-red-500" />
                  )}
                  <span className="font-mono text-sm">{device.deviceId}</span>
                  <span className="text-xs text-gray-500">
                    ({device.district})
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {device.isOnline
                    ? `Last seen: ${format(device.lastSeen, "HH:mm:ss")}`
                    : `Offline ${secondsAgo}s`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
