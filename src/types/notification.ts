export interface NotificationMessage {
  id: string;
  type: "device_offline" | "device_online" | "data_alert" | "system_alert";
  deviceId: string;
  district?: string;
  message: string;
  timestamp: string;
  severity: "low" | "medium" | "high" | "critical";
  acknowledged?: boolean;
  metadata?: {
    lastSeen?: string;
    offlineDuration?: number;
    expectedValue?: number;
    actualValue?: number;
    [key: string]: any;
  };
}

export interface DeviceStatusNotification {
  deviceId: string;
  district: string;
  status: "online" | "offline";
  timestamp: string;
  lastSeen?: string;
  offlineDuration?: number;
}
