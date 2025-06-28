export interface Device {
  id: string;
  name: string;
  description: string;
  connectionType: "mqtts" | "https";
  group: string;
  status: "online" | "offline";
  lastSeen: string;
  signalStrength: number;
}
