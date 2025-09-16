"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { sharedPubSubManager } from "@/lib/sharedPubSubManager";
import {
  NotificationMessage,
  DeviceStatusNotification,
} from "@/types/notification";
import { IOT_TOPICS } from "@/config/iotTopics";

interface NotificationContextType {
  notifications: NotificationMessage[];
  unreadCount: number;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  addNotification: (notification: NotificationMessage) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate unique notification ID
  const generateNotificationId = () => {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Add notification to the list
  const addNotification = (notification: NotificationMessage) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 100)); // Keep only last 100 notifications
  };

  // Create notification from device status update
  const createDeviceStatusNotification = (
    statusUpdate: DeviceStatusNotification
  ): NotificationMessage => {
    const isOffline = statusUpdate.status === "offline";

    return {
      id: generateNotificationId(),
      type: isOffline ? "device_offline" : "device_online",
      deviceId: statusUpdate.deviceId,
      district: statusUpdate.district,
      message: isOffline
        ? `Device ${statusUpdate.deviceId} in ${statusUpdate.district} has gone offline`
        : `Device ${statusUpdate.deviceId} in ${statusUpdate.district} is back online`,
      timestamp: statusUpdate.timestamp,
      severity: isOffline ? "high" : "medium",
      acknowledged: false,
      metadata: {
        lastSeen: statusUpdate.lastSeen,
        offlineDuration: statusUpdate.offlineDuration,
      },
    };
  };

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, acknowledged: true } : notif
      )
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, acknowledged: true }))
    );
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Count unread notifications
  const unreadCount = notifications.filter(
    (notif) => !notif.acknowledged
  ).length;

  useEffect(() => {
    let subscriptionKey: string | null = null;

    const subscribeToNotifications = async () => {
      try {
        setIsLoading(true);
        console.log(
          "Subscribing to notifications topic:",
          IOT_TOPICS.NOTIFICATIONS
        );

        // Subscribe using shared PubSub manager
        subscriptionKey = await sharedPubSubManager.subscribe(
          [IOT_TOPICS.NOTIFICATIONS],
          (message: any) => {
            try {
              const data = message.value || message;

              // Handle different types of notification messages
              if (data.type === "device_status") {
                // Device status update
                const statusUpdate: DeviceStatusNotification = data;
                const notification =
                  createDeviceStatusNotification(statusUpdate);
                addNotification(notification);
              } else if (data.type === "notification") {
                // Direct notification message
                const notification: NotificationMessage = {
                  ...data,
                  id: data.id || generateNotificationId(),
                  acknowledged: false,
                };
                addNotification(notification);
              } else {
                // Generic message - create a system notification
                const notification: NotificationMessage = {
                  id: generateNotificationId(),
                  type: "system_alert",
                  deviceId: data.deviceId || "system",
                  message: data.message || JSON.stringify(data),
                  timestamp: data.timestamp || new Date().toISOString(),
                  severity: data.severity || "low",
                  acknowledged: false,
                  metadata: data,
                };
                addNotification(notification);
              }
            } catch (parseError) {
              console.error("Error parsing notification message:", parseError);
            }
          }
        );

        setIsConnected(true);
        setError(null);
        setIsLoading(false);
      } catch (err: any) {
        console.error("Failed to subscribe to notifications:", err);
        setError(err.message || "Failed to connect to notifications");
        setIsConnected(false);
        setIsLoading(false);
      }
    };

    subscribeToNotifications();

    return () => {
      if (subscriptionKey) {
        console.log("Unsubscribing from notifications");
        sharedPubSubManager.unsubscribe(subscriptionKey);
      }
    };
  }, []);

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    addNotification,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}
