"use client";

import { Settings, Wifi, WifiOff } from "lucide-react";
import { useDevicesWithStatus } from "@/hooks/useDevicesWithStatus";

interface DeviceProps {
  title: string;
  icon: "online" | "offline" | "all";
}

export default function DeviceStatusCard({ title, icon }: DeviceProps) {
  const { devices } = useDevicesWithStatus();

  const getIcon = () => {
    switch (icon) {
      case "online":
        return <Wifi className="text-green-500" />;
      case "offline":
        return <WifiOff className="text-red-500" />;
      default:
        return <Settings className="text-gray-500" />;
    }
  };

  const getDeviceCount = () => {
    return devices.length;
  };

  const getOnlineCount = () => {
    return devices.filter((device) => device.realTimeStatus === "online")
      .length;
  };

  const getOfflineCount = () => {
    return devices.filter((device) => device.realTimeStatus === "offline")
      .length;
  };

  const getValue = () => {
    if (icon === "online") {
      return getOnlineCount();
    }
    if (icon === "offline") {
      return getOfflineCount();
    }
    if (icon === "all") {
      return getDeviceCount();
    }
    return devices.length;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between item-gray-900">
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
        <div className="text-2xl">{getIcon()}</div>
      </div>
      <div className="mt-2 text-3xl font-semibold text-gray-900">
        {getValue()}
      </div>
    </div>
  );
}
