export interface Dataset {
  id: string;
  _time: string | Date;
  temperature: number;
  humidity: number;
  pressure: number;
  avgWindSpeed: number;
  maxWindSpeed: number;
  windDirection: number;
  rainFallbyDay: number;
  rainFallbyHour: number;
  location: string;
}

export interface WeatherDataset {
  district: string;
  lastUpdate: string;
  dataSize: string;
}

export interface DatasetInfo {
  latest_update: string;
  url: string;
  size_bytes: number;
  size_formatted: string;
}

export interface WeatherDatasetResponse {
  datasets: Record<string, DatasetInfo>;
}
