export interface Device {
  id: string;
  name: string;
  connectionType: "MQTTS";
  group: string;
  status: "online" | "offline";
  lastSeen: string;
  signalStrength: number;
  thingTypeName?: string;
  version?: number;
  attributes?: Record<string, string>;
}

export interface DeviceListResponse {
  success: boolean;
  message: string;
  devices: Device[];
  thingGroup: string;
  totalCount: number;
  fetchedAt: string;
  fetchedBy: string;
}

export interface DeviceRegistrationData {
  deviceName: string;
  thingGroup: string;
  connectionType: "MQTTS";
}

export interface DeviceCertificates {
  certificateArn: string;
  certificatePem: string;
  privateKey: string;
  publicKey: string;
}

export interface DeviceConnectionInfo {
  endpoint: string;
  port: number;
  protocol: string;
  topics: {
    publish: string;
  };
}

export interface DeviceRegistrationResponse {
  success: boolean;
  message: string;
  thingName: string;
  thingGroup: string;
  policy: string;
  deviceConnectionInfo: DeviceConnectionInfo;
  certificates: DeviceCertificates;
  accountId: string;
  registeredAt: string;
  registeredBy: string;
}
