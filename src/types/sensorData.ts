// Define the expected data structure
export interface WindData {
  id: string | number;
  timestamp: string | number;
  avgWindSpeed: number;
  maxWindSpeed: number;
  windDirection: number;
}

export interface cardData {
  id: string | number;
  timestamp: string | number;
  temperature: number;
  humidity: number;
  pressure: number;
  avgWindSpeed: number;
  maxWindSpeed: number;
  windDirection: number;
  rainfall1hr?: number;
  rainfall24hr?: number;
  rainfallRate?: number;
  totalRainfall?: number;
}

export interface RainData {
  id: string | number;
  timestamp: string | number;
  rainFallbyDay: number;
  rainFallbyHour: number;
}

// Payload data structure from IoT messages
export interface TelemetryPayload {
  data?: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    avgWindSpeed?: number;
    maxWindSpeed?: number;
    windDirection?: number;
    rainfallRate?: number;
    totalRainfall?: number;
    rainfall1hr?: number;
    rainfall24hr?: number;
  };
  timestamp?: string;
  deviceId?: string;
}
