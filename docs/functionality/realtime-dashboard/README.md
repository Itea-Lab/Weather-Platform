# Real-time Weather Dashboard

## Overview

This document explains the implementation of a real-time weather dashboard using shared PubSub connections, global context management, and optimized device status monitoring. The dashboard provides live weather data with efficient resource usage and intelligent notification systems.

## Architecture Overview

```
IoT Devices → AWS IoT Core → MQTT Topics → Shared PubSub Manager → Global Contexts → React Components
```

### Key Components

1. **AWS IoT Core**: Manages device connections and message routing
2. **MQTT Topics**: Channel weather data from specific locations/devices
3. **Shared PubSub Manager**: Single WebSocket connection for all subscriptions
4. **Global Contexts**: TelemetryContext and NotificationContext for state management
5. **Device Status Monitor**: Intelligent device monitoring with dual thresholds
6. **Optimized Components**: React hooks with proper memoization strategies

## Implementation Details

### 1. Shared Connection Management

**File**: `src/lib/sharedPubSubManager.ts`

The shared PubSub manager ensures a single WebSocket connection is used for all MQTT subscriptions, improving performance and avoiding connection limits.

```typescript
class SharedPubSubManager {
  private pubsub: PubSub | null = null;
  private subscriptions: Map<string, any> = new Map();

  async subscribe(
    topics: string[],
    callback: (data: any) => void
  ): Promise<string> {
    // Initialize PubSub if needed
    if (!this.pubsub) {
      const config = await iotConfigManager.getConfig();
      this.pubsub = new PubSub({
        region: config.region,
        endpoint: config.endpoint,
        credentials: config.credentials,
      });
    }

    // Subscribe and manage callbacks
    const subscriptionKey = this.generateSubscriptionKey();
    const subscription = this.pubsub.subscribe({ topics }).subscribe({
      next: callback,
      error: (error) => console.error("Subscription error:", error),
    });

    this.subscriptions.set(subscriptionKey, subscription);
    return subscriptionKey;
  }
}
```

### 2. Global Telemetry Context

**File**: `src/hooks/TelemetryContext.tsx`

Provides platform-wide telemetry data management with automatic subscription handling.

```typescript
export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [weatherData, setWeatherData] = useState<cardData | null>(null);
  const [windData, setWindData] = useState<WindData[]>([]);
  const [rainData, setRainData] = useState<RainData[]>([]);

  useEffect(() => {
    let subscriptionKey: string | null = null;

    const subscribeToTelemetry = async () => {
      if (!weatherTopic) return;

      subscriptionKey = await sharedPubSubManager.subscribe(
        [weatherTopic],
        (data: any) => {
          const payload = data.value || data;
          if (payload && payload.data) {
            transformMessage(payload);
            setIsConnected(true);
          }
        }
      );
    };

    subscribeToTelemetry();
    return () => {
      if (subscriptionKey) {
        sharedPubSubManager.unsubscribe(subscriptionKey);
      }
    };
  }, [weatherTopic, transformMessage]);
}
```

      } catch (err) {
        setError(new Error("Failed to connect to weather data stream"));

### 3. Device Status Monitoring

**File**: `src/lib/deviceStatusMonitor.ts`

Intelligent device monitoring with dual threshold system for optimal user experience.

```typescript
export class DeviceStatusMonitor {
  private readonly UI_OFFLINE_THRESHOLD = 3000; // 3s for UI indicators
  private readonly NOTIFICATION_THRESHOLD = 30000; // 30s for notifications

  private checkDeviceStatuses() {
    this.deviceActivity.forEach((activity, deviceId) => {
      const timeSinceLastSeen = Date.now() - activity.lastSeen.getTime();

      // Update UI status (quick response for visual indicators)
      activity.isOnline = timeSinceLastSeen <= this.UI_OFFLINE_THRESHOLD;

      // Send notification only after longer threshold
      if (
        timeSinceLastSeen > this.NOTIFICATION_THRESHOLD &&
        !activity.offlineNotificationSent
      ) {
        this.publishDeviceStatusNotification(
          deviceId,
          activity.district,
          "offline",
          activity.lastSeen
        );
        activity.offlineNotificationSent = true;
      }
    });
  }
}
```

**Key Features**:

- **UI Indicators**: Respond within 3 seconds for immediate visual feedback
- **Notifications**: Only sent after 30 seconds to avoid spam
- **Automatic Recovery**: Online notifications when devices reconnect
- **Global Monitoring**: Tracks all devices across the platform

### 4. Optimized React Components

**File**: `src/components/platform/dashboard/WindChart.tsx`

Efficient real-time chart components using proper React optimization patterns.

```typescript
export default function WindChart() {
  const { windData, error, isLoading } = useTelemetry();
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Real-time updates for status indicators
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Expensive chart data transformation only
  const chartData = useMemo(() => {
    if (!windData || windData.length === 0) return [];
    return windData.map((item) => ({
      ...item,
      formattedTime: formatDate(item.timestamp),
    }));
  }, [windData]);

  // Real-time status calculation
  const statusInfo = useMemo(() => {
    if (!windData || windData.length === 0)
      return { statusText: "", isStale: false };

    const latestData = windData[windData.length - 1];
    const timeDiff = currentTime - new Date(latestData.timestamp).getTime();
    const isStale = timeDiff > 3000;

    return {
      statusText: isStale
        ? "Last data from IoT sensors"
        : "Live data from IoT sensors",
      isStale,
    };
  }, [windData, currentTime]);
}
```

**Optimization Strategy**:

- **useState + useEffect**: For real-time status updates
- **useMemo**: Only for expensive computations (chart data transformation)
- **Simple functions**: No memoization for basic operations like date formatting
- **Selective re-renders**: Components only update when necessary

## Architecture Benefits

### Performance Optimizations

1. **Single WebSocket Connection**: Shared PubSub manager reduces connection overhead
2. **Consolidated Utilities**: Shared device status calculations across components
3. **React Optimization**: Proper use of hooks prevents unnecessary re-renders
4. **Global State Management**: Contexts provide data without prop drilling

### Scalability Features

1. **Topic-based Architecture**: Easy addition of new weather stations
2. **Modular Components**: Reusable chart and data components
3. **Shared Infrastructure**: Connection pooling and resource optimization
4. **Error Isolation**: Component-level error boundaries

### User Experience

1. **Immediate Feedback**: UI indicators respond within 3 seconds
2. **Smart Notifications**: Only notify after 30 seconds to avoid spam
3. **Graceful Degradation**: System continues working with partial data
4. **Visual Status**: Clear indicators for connection health and data freshness

## Data Flow

```
1. IoT Device → AWS IoT Core → MQTT Topic
2. Shared PubSub Manager → Global Context (Telemetry/Notifications)
3. Device Status Monitor → Real-time Status Updates
4. React Components → Optimized Rendering
5. User Interface → Live Dashboard Updates
```

## Configuration

### Environment Variables

```env
# AWS Configuration
DEFAULT_REGION=your-aws-region
AWS_IOT_ENDPOINT=your-iot-endpoint

# Topic Configuration
IOT_WEATHER_TOPIC_PREFIX=weather/data
IOT_NOTIFICATION_TOPIC=weather/notifications
```

### Topic Structure

```
weather/data/
├── hcmc/          # Ho Chi Minh City weather data
├── hanoi/         # Hanoi weather data
├── danang/        # Da Nang weather data
└── cantho/        # Can Tho weather data

weather/notifications/  # Device status notifications
```

### Message Formats

**Weather Data Message**:

```json
{
  "deviceId": "raspi-1-weather-edge",
  "timestamp": "2025-09-16T10:30:00Z",
  "data": {
    "temperature": 28.5,
    "humidity": 75.2,
    "pressure": 1013.25,
    "avgWindSpeed": 5.2,
    "maxWindSpeed": 8.1,
    "windDirection": 180,
    "rainfall1hr": 0.0,
    "rainfall24hr": 2.5
  }
}
```

**Device Status Notification**:

```json
{
  "type": "device_status",
  "deviceId": "raspi-1-weather-edge",
  "district": "hcmc",
  "status": "offline",
  "timestamp": "2025-09-16T10:30:00Z",
  "lastSeen": "2025-09-16T10:29:30Z",
  "offlineDuration": 30000
}
```

    "pressure": 1013.25,
    "windDirection": 180,
    "avgWindSpeed": 2.5,
    "maxWindSpeed": 4.1,
    "rainfall1hr": 0.0,
    "rainfall24hr": 5.2

}
}

````

## Connection Management

### 1. Subscription Lifecycle

- **Mount**: Hook creates new subscription
- **Topic Change**: Cleans up old subscription, creates new one
- **Unmount**: Properly unsubscribes to prevent memory leaks

### 2. Error Handling

```typescript
error: (err: any) => {
  console.error("Weather data subscription error:", err);
  setError(new Error(`Connection error: ${err.message}`));
  setIsConnected(false);
};
````

### 3. Connection States

- **Loading**: Initial connection establishment
- **Connected**: Active data flow
- **Error**: Connection issues or data parsing errors
- **Disconnected**: No active subscription

## Performance Considerations

### 1. Memory Management

- Proper subscription cleanup prevents memory leaks
- State updates only when component is mounted

### 2. Re-connection Strategy

- Automatic reconnection on topic changes
- Error boundaries for graceful failure handling

### 3. Data Optimization

- Transform data only when needed
- Minimize state updates for better performance

## Security Features

### 1. Authentication

- Integrated with AWS Amplify Auth
- Secure WebSocket connections
- Topic-based access control

### 2. Data Validation

- Message structure validation
- Error handling for malformed data

## Troubleshooting

### Common Issues

1. **Connection Failures**

   - Check IoT endpoint accessibility
   - Verify authentication status
   - Ensure proper AWS credentials

2. **Missing Data**

   - Confirm IoT device is publishing
   - Check topic name formatting
   - Verify message structure

3. **Performance Issues**
   - Monitor subscription count
   - Check for memory leaks
   - Optimize data transformation

### Debug Information

Enable debug logging to troubleshoot:

```typescript
console.log("Connecting to IoT topic:", selectedTopic);
console.log("IoT Config:", iotConfig);
```
