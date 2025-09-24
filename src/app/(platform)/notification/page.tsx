"use client";

import { useNotifications } from "@/hooks/NotificationContext";
import {
  NotificationSkeleton,
  ConnectionSkeleton,
} from "@/components/platform/notification/NotificationSkeleton";
import { format } from "date-fns";
import {
  Bell,
  BellOff,
  CheckCircle,
  AlertCircle,
  XCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function NotificationPage() {
  usePageTitle("Notifications");

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotifications();

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="w-5 h-5 text-red-700" />;
      case "high":
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case "medium":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "low":
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-50 border-red-200";
      case "high":
        return "bg-orange-50 border-orange-200";
      case "medium":
        return "bg-yellow-50 border-yellow-200";
      case "low":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "device_offline":
        return <WifiOff className="w-4 h-4 text-red-500" />;
      case "device_online":
        return <Wifi className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-gray-600">
            Device status updates and system alerts
          </p>
        </div>
      </div>

      {/* Controls */}
      {!isLoading && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center">
            <div>
              {unreadCount > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-1 text-sm bg-[#4D5E3F] text-white rounded hover:bg-[#3d4a32]"
                >
                  Mark All Read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">Connection Error: {error}</p>
            </div>
          )}
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <>
            <ConnectionSkeleton />
            <NotificationSkeleton count={5} />
          </>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <BellOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              No notifications at this time
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Device status updates and alerts will appear here
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-lg shadow p-4 border-l-4 ${getSeverityBg(
                notification.severity
              )} ${notification.acknowledged ? "opacity-75" : ""}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getSeverityIcon(notification.severity)}
                    {getTypeIcon(notification.type)}
                    <h3 className="font-semibold text-gray-900">
                      {notification.type
                        .replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </h3>
                    {notification.district && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {notification.district}
                      </span>
                    )}
                    {!notification.acknowledged && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded">
                        New
                      </span>
                    )}
                  </div>

                  <p className="text-gray-800 mb-2">{notification.message}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Device: {notification.deviceId}</span>
                    <span>
                      {format(
                        new Date(notification.timestamp),
                        "MMM dd, yyyy HH:mm:ss"
                      )}
                    </span>
                    {notification.metadata?.lastSeen && (
                      <span>
                        Last seen:{" "}
                        {format(
                          new Date(notification.metadata.lastSeen),
                          "HH:mm:ss"
                        )}
                      </span>
                    )}
                    {notification.metadata?.offlineDuration && (
                      <span>
                        Offline for:{" "}
                        {Math.floor(
                          notification.metadata.offlineDuration / 1000
                        )}
                        s
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {!notification.acknowledged && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="px-2 py-1 text-xs bg-[#4D5E3F] text-white rounded hover:bg-[#3d4a32]"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
