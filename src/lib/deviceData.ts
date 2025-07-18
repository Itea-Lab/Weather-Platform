import { Device } from "@/types/device"

export const devices: Device[] = [
  {
    id: "device-001",
    name: "Temperature Sensor #1",
    connectionType: "MQTTS",
    group: "Outdoor Sensors",
    status: "online",
    lastSeen: new Date().toISOString(),
    signalStrength: -42,
  },
  {
    id: "device-002",
    name: "Humidity Monitor",
    connectionType: "MQTTS",
    group: "Indoor Sensors",
    status: "online",
    lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    signalStrength: -38,
  },
  {
    id: "device-003",
    name: "Multi Sensor Hub",
    connectionType: "MQTTS",
    group: "Sensor Hubs",
    status: "online",
    lastSeen: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    signalStrength: -45,
  },
  {
    id: "device-004",
    name: "Wind Speed Sensor",
    connectionType: "MQTTS",
    group: "Outdoor Sensors",
    status: "offline",
    lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    signalStrength: -50,
  },
  {
    id: "device-005",
    name: "Barometric Pressure Sensor",
    connectionType: "MQTTS",
    group: "Weather Sensors",
    status: "online",
    lastSeen: new Date().toISOString(),
    signalStrength: -40,
  },
];
