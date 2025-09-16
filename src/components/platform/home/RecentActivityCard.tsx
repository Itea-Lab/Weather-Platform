"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useNotifications } from "@/hooks/NotificationContext";
import { format } from "date-fns";
import { Bell, Activity, AlertTriangle, Info } from "lucide-react";

interface Activity {
  id: string;
  type: "sensor" | "alert" | "device" | "platform" | "status";
  name: string;
  status?: string;
  value?: string | number;
  timestamp: Date;
}

export default function RecentActivityCard() {
  const { notifications } = useNotifications();

  // Convert notifications to activities format - memoized to prevent unnecessary re-computation
  const activities: Activity[] = useMemo(() => {
    const transformedActivities = notifications
      .slice(0, 5)
      .map((notification) => ({
        id: notification.id,
        type: (notification.type.includes("device")
          ? "device"
          : notification.type.includes("system")
          ? "platform"
          : "alert") as Activity["type"],
        name: notification.deviceId || "System Notification",
        status:
          notification.type === "device_online"
            ? "Online"
            : notification.type === "device_offline"
            ? "Offline"
            : notification.severity,
        value:
          notification.message?.substring(0, 50) +
          (notification.message?.length > 50 ? "..." : ""),
        timestamp: new Date(notification.timestamp),
      }));

    // If no notifications, show placeholder
    if (transformedActivities.length === 0) {
      transformedActivities.push({
        id: "placeholder",
        type: "platform",
        name: "Welcome to Weather Platform",
        status: "Active",
        value: "System initialized successfully",
        timestamp: new Date(),
      });
    }

    return transformedActivities;
  }, [notifications]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Online":
      case "Normal":
      case "Active":
      case "low":
        return "bg-green-500";
      case "High":
      case "Warning":
      case "medium":
        return "bg-yellow-500";
      case "Low":
      case "Info":
        return "bg-blue-500";
      case "Offline":
      case "Critical":
      case "Error":
      case "high":
      case "critical":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "device":
        return <Activity className="w-4 h-4" />;
      case "alert":
        return <AlertTriangle className="w-4 h-4" />;
      case "platform":
        return <Info className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-2xl font-bold tracking-tight mb-1">
        Recent Activities
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Latest updates from your devices
      </p>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="bg-slate-50 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer w-full"
          >
            <div className="flex items-center gap-4">
              <span
                className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${getStatusColor(
                  activity.status
                )}`}
              >
                {getTypeIcon(activity.type)}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {activity.name}
                  </h3>
                  <span className="text-xs text-gray-400">
                    {format(activity.timestamp, "HH:mm:ss")}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {activity.type.charAt(0).toUpperCase() +
                    activity.type.slice(1)}{" "}
                  • {activity.status}
                </p>
                {activity.value && (
                  <p className="text-sm text-gray-600 mt-1">{activity.value}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Link
          href="/notification"
          className="text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          View All Activities
        </Link>
      </div>
    </div>
  );
}
