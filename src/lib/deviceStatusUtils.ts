/**
 * Shared utilities for device status calculations
 * Consolidates time calculation logic used across multiple hooks and components
 */

export interface DeviceStatus {
  isOnline: boolean;
  lastSeen: Date | null;
  secondsOffline: number;
}

export const DEVICE_OFFLINE_THRESHOLD = 3000; // 3 seconds

/**
 * Determines if a timestamp indicates the device is offline
 */
export function isDeviceDataStale(
  timestamp?: string | Date | number | null,
  currentTime = Date.now(),
  threshold = DEVICE_OFFLINE_THRESHOLD
): boolean {
  if (!timestamp) return true;

  try {
    const dataTime = new Date(timestamp).getTime();
    const timeDiff = currentTime - dataTime;
    return timeDiff > threshold;
  } catch {
    return true;
  }
}

/**
 * Gets detailed device status from timestamp
 */
export function getDeviceStatus(
  timestamp?: string | Date | number | null,
  currentTime = Date.now(),
  threshold = DEVICE_OFFLINE_THRESHOLD
): DeviceStatus {
  if (!timestamp) {
    return {
      isOnline: false,
      lastSeen: null,
      secondsOffline: 0,
    };
  }

  try {
    const lastSeen = new Date(timestamp);
    const timeDiff = currentTime - lastSeen.getTime();
    const isOnline = timeDiff <= threshold;
    const secondsOffline = isOnline ? 0 : Math.floor(timeDiff / 1000);

    return {
      isOnline,
      lastSeen,
      secondsOffline,
    };
  } catch {
    return {
      isOnline: false,
      lastSeen: null,
      secondsOffline: 0,
    };
  }
}

/**
 * Formats time since last update in human-readable format
 */
export function formatTimeSinceUpdate(
  timestamp?: string | Date | number | null,
  currentTime = Date.now(),
  threshold = DEVICE_OFFLINE_THRESHOLD
): string {
  if (!timestamp) return "Unknown";

  try {
    const dataTime = new Date(timestamp);
    const timeDiff = currentTime - dataTime.getTime();

    if (timeDiff > threshold) {
      const secondsAgo = Math.floor(timeDiff / 1000);
      const minutesAgo = Math.floor(secondsAgo / 60);
      const hoursAgo = Math.floor(minutesAgo / 60);

      if (hoursAgo > 0) {
        return `${hoursAgo}h ${minutesAgo % 60}m ago`;
      } else if (minutesAgo > 0) {
        return `${minutesAgo}m ${secondsAgo % 60}s ago`;
      } else {
        return `${secondsAgo}s ago`;
      }
    }

    return dataTime.toLocaleTimeString();
  } catch {
    return "Invalid time";
  }
}

/**
 * Checks if timestamp is recent enough to be considered valid activity
 * Used for filtering out old data when recording device activity
 */
export function isRecentActivity(
  timestamp: string | number,
  maxAge = 10000 // 10 seconds
): boolean {
  try {
    const now = Date.now();
    const dataTime = new Date(timestamp).getTime();
    return now - dataTime < maxAge;
  } catch {
    return false;
  }
}
