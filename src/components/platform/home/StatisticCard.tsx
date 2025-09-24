"use client";

import { Cpu, Database, MessageSquareDot, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useDevicesWithStatus } from "@/hooks/useDevicesWithStatus";
import { useNotifications } from "@/hooks/NotificationContext";
import { useTotalReadings } from "@/lib/api";

export default function StatisticCard() {
  const { devices, isLoading: devicesLoading } = useDevicesWithStatus();
  const { notifications } = useNotifications();
  const {
    totalReadings,
    isEstimate,
    isLoading: readingsLoading,
  } = useTotalReadings();

  // Calculate total devices count
  const totalDevices = useMemo(() => devices.length, [devices]);

  // Count active alerts from notifications
  const activeAlerts = useMemo(() => notifications.length, [notifications]);

  const statistics = useMemo(
    () => [
      {
        title: "Total Devices",
        value: devicesLoading ? "Loading..." : totalDevices,
        icon: <Cpu className="w-6 h-6 text-green-500" />,
        loading: devicesLoading,
      },
      {
        title: "Total Readings",
        value: readingsLoading
          ? "Loading..."
          : isEstimate
          ? `~${totalReadings.toLocaleString()}`
          : totalReadings.toLocaleString(),
        icon: <Database className="w-6 h-6 text-purple-500" />,
        loading: readingsLoading,
      },
      {
        title: "Active Alerts",
        value: activeAlerts,
        icon: <MessageSquareDot className="w-6 h-6 text-red-500" />,
        loading: false,
      },
    ],
    [
      devicesLoading,
      totalDevices,
      readingsLoading,
      totalReadings,
      isEstimate,
      activeAlerts,
    ]
  );

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statistics.map((stat, index) => (
          <div key={index} className="p-4 rounded-lg transition-colors">
            <div className="flex items-center mb-2">
              {stat.icon}
              <h3 className="ml-2 text-lg font-semibold">{stat.title}</h3>
            </div>
            <div className="flex items-center">
              {stat.loading && typeof stat.value === "string" ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-500">{stat.value}</span>
                </div>
              ) : (
                <p className="text-2xl font-bold">{stat.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
