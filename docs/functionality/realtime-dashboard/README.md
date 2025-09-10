# Real-time Weather Dashboard with AWS Amplify PubSub

## Overview

This document explains how we implemented a real-time weather dashboard using AWS Amplify PubSub with IoT Core integration. The dashboard displays live weather data from IoT devices with dynamic topic subscription and optimized connection management.

## Architecture Overview

```
IoT Devices → AWS IoT Core → MQTT Topics → Amplify PubSub → Nextjs Dashboard
```

### Key Components

1. **AWS IoT Core**: Manages device connections and message routing
2. **MQTT Topics**: Channel weather data from specific locations/devices
3. **Amplify PubSub**: Client-side library for real-time subscriptions
4. **React Hooks**: Custom hooks for data management and state
5. **Topic Context**: Global state management for dynamic subscriptions

## Implementation Details

### 1. IoT Configuration Setup

**File**: `src/lib/iotConfig.ts`

```typescript
// Dynamic IoT configuration based on selected topic
export async function getIoTConfig(customTopic?: string) {
  try {
    const { region, credentials, identityId } = await getAWSCredentials();
    const endpoint = await getIoTEndpoint();
    const finalTopic = customTopic;
    if (!finalTopic) {
      throw new Error(
        "No topic provided to getIoTConfig - this is a bug in the topic selection system"
      );
    }
    return {
      endpoint: `wss://${endpoint}/mqtt`,
      region,
      topic: finalTopic,
      credentials,
    };
  } catch (error) {
    console.error("Failed to get IoT configuration:", error);
    throw error;
  }
}
```

**Purpose**:

- Provides dynamic IoT endpoint configuration
- Generates proper MQTT topic names
- Handles authentication and region settings

### 2. Real-time Data Hooks

**File**: `src/hooks/useRealtimeWeatherData.ts`

```typescript
export function useRealtimeWeatherData() {
  const { selectedTopic } = useTopicContext();
  const [data, setData] = useState<cardData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let subscription: any = null;

    const setupSubscription = async () => {
      try {
        // Get IoT configuration for current topic
        const iotConfig = await getIoTConfig(selectedTopic);
        const topic = getWeatherTopic(selectedTopic);

        // Create PubSub client
        const pubSubClient = new PubSub({
          region: iotConfig.region,
          endpoint: iotConfig.endpoint,
        });

        // Subscribe to weather topic
        subscription = pubSubClient.subscribe({ topics: [topic] }).subscribe({
          next: (payload: any) => {
            const weatherData = transformWeatherMessage(
              payload.value || payload
            );
            setData(weatherData);
            setIsConnected(true);
          },
          error: (err: any) => {
            setError(new Error(`Connection error: ${err.message}`));
            setIsConnected(false);
          },
        });

        setIsLoading(false);
      } catch (err) {
        setError(new Error("Failed to connect to weather data stream"));
        setIsLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [selectedTopic]); // Re-run when topic changes

  return { data, error, isLoading, isConnected };
}
```

**Key Features**:

- Dynamic topic subscription based on context
- Automatic reconnection on topic changes
- Error handling and loading states
- Clean subscription management

### 3. Data Transformation

```typescript
const transformWeatherMessage = useCallback((payload: any): cardData => {
  return {
    id: Date.now(),
    deviceId: payload.deviceId,
    timestamp: payload.timestamp,
    location: payload.location || "Unknown",
    temperature: payload.data.temperature,
    humidity: payload.data.humidity,
    pressure: payload.data.pressure,
    windDirection: payload.data.windDirection,
    avgWindSpeed: payload.data.avgWindSpeed,
    maxWindSpeed: payload.data.maxWindSpeed,
    rainfall1hr: payload.data.rainfall1hr,
    rainfall24hr: payload.data.rainfall24hr,
  };
}, []);
```

**Purpose**: Converts raw IoT messages into typed data structures for the UI.

## AWS Amplify PubSub Integration

### 1. Client Configuration

The PubSub client is configured with:

- **Region**: AWS region where IoT Core is deployed
- **Endpoint**: WebSocket endpoint for MQTT over WebSockets
- **Authentication**: Integrated with Amplify Auth

### 2. Subscription Pattern

```typescript
const pubSubClient = new PubSub({
  region: "your-region",
  endpoint: "wss://your-iot-endpoint/mqtt",
});

subscription = pubSubClient.subscribe({ topics: [topic] }).subscribe({
  next: (message) => handleMessage(message),
  error: (error) => handleError(error),
});
```

### 3. Message Flow

1. **IoT Device** publishes to MQTT topic (e.g., `weather/data/<location>`)
2. **AWS IoT Core** receives and routes the message
3. **Amplify PubSub** establishes WebSocket connection
4. **React Hook** receives real-time updates
5. **UI Components** automatically re-render with new data

## Topic-Based Data Organization

### Topic Structure

```
weather/data
├── hcmc/          # Ho Chi Minh City weather data
├── hanoi/         # Hanoi weather data
├── danang/        # Da Nang weather data
└── cantho/        # Can Tho weather data
```

### Message Format

```json
{
  "deviceId": "weather-station-001",
  "timestamp": "2025-08-20T10:30:00Z",
  "location": "Ho Chi Minh City",
  "data": {
    "temperature": 28.5,
    "humidity": 75.2,
    "pressure": 1013.25,
    "windDirection": 180,
    "avgWindSpeed": 2.5,
    "maxWindSpeed": 4.1,
    "rainfall1hr": 0.0,
    "rainfall24hr": 5.2
  }
}
```

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
```

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
