/**
 * IoT Configuration for Real-time Weather Dashboard
 *
 * Edit this file to change IoT topics and other real-time settings
 */

// ===== IoT TOPIC CONFIGURATION =====
// Edit these topics to match your IoT Core setup

export const IOT_TOPICS = {
  // Main weather telemetry topic pattern (use + for wildcard to catch all districts)
  WEATHER_TELEMETRY_ALL: "weatherPlatform/telemetry/+",

  // Specific device topics by district
  DISTRICT_5: "weatherPlatform/telemetry/district5",
  DISTRICT_6: "weatherPlatform/telemetry/district6",
  DISTRICT_1: "weatherPlatform/telemetry/district1",

  // Alert topics (if needed in future)
  WEATHER_ALERTS: "weatherPlatform/alerts/+",

  // Status topics
  DEVICE_STATUS: "weatherPlatform/status/+",
} as const;

// ===== ACTIVE TOPIC SELECTION =====
// NOTE: Topic selection is now handled dynamically via TopicContext
// Devices publish to: weatherPlatform/telemetry/district5, weatherPlatform/telemetry/district6, etc.
// IoT Core can observe all with: weatherPlatform/telemetry/+
// Dashboard subscribes to user-selected district via TopicSelector component

// ===== DATA PARSING CONFIGURATION =====
export const DATA_CONFIG = {
  // Maximum number of data points to keep for charts
  MAX_WIND_POINTS: 20,
  MAX_RAIN_POINTS: 24,

  // Data update intervals (in milliseconds)
  CHART_UPDATE_INTERVAL: 1000, // How often to update charts when new data arrives

  // Data validation
  REQUIRE_DEVICE_ID: true,
  REQUIRE_TIMESTAMP: true,
} as const;

// ===== DEBUGGING =====
export const DEBUG_CONFIG = {
  // Set to true to enable verbose logging
  VERBOSE_LOGGING: true,

  // Set to true to log all incoming IoT messages
  LOG_RAW_MESSAGES: true,

  // Set to true to show debug console on dashboard
  SHOW_DEBUG_CONSOLE: true,
} as const;

// ===== EXPORT FUNCTIONS =====

/**
 * Get all available topic configurations
 */
export function getAllTopics() {
  return IOT_TOPICS;
}

/**
 * Check if a topic is valid
 */
export function isValidTopic(topic: string): boolean {
  return Object.values(IOT_TOPICS).includes(topic as any);
}

/**
 * Get debug configuration
 */
export function getDebugConfig() {
  return DEBUG_CONFIG;
}

/**
 * Get data configuration
 */
export function getDataConfig() {
  return DATA_CONFIG;
}
