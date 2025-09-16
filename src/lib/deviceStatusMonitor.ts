import { sharedPubSubManager } from "./sharedPubSubManager";
import { IOT_TOPICS } from "@/config/iotTopics";
import {
  isRecentActivity,
  DEVICE_OFFLINE_THRESHOLD,
  DEVICE_NOTIFICATION_THRESHOLD,
} from "./deviceStatusUtils";

interface DeviceActivity {
  deviceId: string;
  district: string;
  lastSeen: Date;
  isOnline: boolean;
  offlineNotificationSent: boolean;
}

export class DeviceStatusMonitor {
  private static instance: DeviceStatusMonitor;
  private deviceActivity: Map<string, DeviceActivity> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly UI_OFFLINE_THRESHOLD = DEVICE_OFFLINE_THRESHOLD; // 3s for UI indicators
  private readonly NOTIFICATION_THRESHOLD = DEVICE_NOTIFICATION_THRESHOLD; // 30s for notifications
  private readonly CHECK_INTERVAL = 1000; // Check every second

  private constructor() {}

  static getInstance(): DeviceStatusMonitor {
    if (!DeviceStatusMonitor.instance) {
      DeviceStatusMonitor.instance = new DeviceStatusMonitor();
    }
    return DeviceStatusMonitor.instance;
  }

  async initialize() {
    try {
      // Start monitoring device activity
      this.startMonitoring();
      console.log("Device Status Monitor initialized");
    } catch (error) {
      console.error("Failed to initialize Device Status Monitor:", error);
    }
  }

  // Called when telemetry data is received
  recordDeviceActivity(
    deviceId: string,
    district: string,
    timestamp: string | number
  ) {
    const dataTime = new Date(timestamp);

    // Only record if the data is recent (not old data)
    if (isRecentActivity(timestamp)) {
      const wasOffline = this.deviceActivity.get(deviceId)?.isOnline === false;

      this.deviceActivity.set(deviceId, {
        deviceId,
        district,
        lastSeen: dataTime,
        isOnline: true,
        offlineNotificationSent: false,
      });

      // If device was offline and now online, publish online notification
      if (wasOffline) {
        this.publishDeviceStatusNotification(
          deviceId,
          district,
          "online",
          dataTime
        );
      }
    }
  }

  private startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.checkDeviceStatuses();
    }, this.CHECK_INTERVAL);
  }

  private checkDeviceStatuses() {
    const now = new Date();

    this.deviceActivity.forEach((activity, deviceId) => {
      const timeSinceLastSeen = now.getTime() - activity.lastSeen.getTime();

      // Update UI status (quick response for visual indicators)
      activity.isOnline = timeSinceLastSeen <= this.UI_OFFLINE_THRESHOLD;

      // Send notification only after longer threshold
      if (
        timeSinceLastSeen > this.NOTIFICATION_THRESHOLD &&
        !activity.offlineNotificationSent
      ) {
        activity.offlineNotificationSent = true;

        this.publishDeviceStatusNotification(
          deviceId,
          activity.district,
          "offline",
          activity.lastSeen,
          timeSinceLastSeen
        );
      }
    });
  }

  private async publishDeviceStatusNotification(
    deviceId: string,
    district: string,
    status: "online" | "offline",
    lastSeen: Date,
    offlineDuration?: number
  ) {
    const notification = {
      type: "device_status",
      deviceId,
      district,
      status,
      timestamp: new Date().toISOString(),
      lastSeen: lastSeen.toISOString(),
      ...(offlineDuration && { offlineDuration }),
    };

    try {
      // console.log(
      //   `Publishing ${status} notification for device ${deviceId}:`,
      //   notification
      // );

      await sharedPubSubManager.publish(IOT_TOPICS.NOTIFICATIONS, notification);

      console.log(
        `Successfully published ${status} notification for device ${deviceId}`
      );
    } catch (error) {
      console.error(
        `Failed to publish ${status} notification for device ${deviceId}:`,
        error
      );
    }
  }

  // Get current device statuses
  getDeviceStatuses(): DeviceActivity[] {
    return Array.from(this.deviceActivity.values());
  }

  // Get specific device status
  getDeviceStatus(deviceId: string): DeviceActivity | undefined {
    return this.deviceActivity.get(deviceId);
  }

  // Cleanup
  destroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.deviceActivity.clear();
    console.log("🔌 Device Status Monitor destroyed");
  }
}

// Export singleton instance
export const deviceStatusMonitor = DeviceStatusMonitor.getInstance();
