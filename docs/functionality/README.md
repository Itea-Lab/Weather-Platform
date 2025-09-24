# Weather Platform Documentation

## Table of Contents

### Core Functionality

- [Real-time Dashboard Implementation](./realtime-dashboard/README.md)
- [Dynamic Topic Subscription System](./changing-topic-subscription/README.md)
- [Hook Optimization: Props Passing Strategy](./hook-props-passing.md)

### Data Processing Pipeline

- [Dataset Transformation](./dataset-transformation/README.md) - Step Functions, Glue crawler, and ETL operations
- [CloudFront CDN for Resources](./cloudfront-for-download-resources/README.md) - Global dataset distribution

### Backend Setup

- [AWS Amplify Backend Setup](../setup_amplify_backend/README.md)
- [Authentication System](../setup_amplify_backend/authentication/README.md)
- [Lambda Functions](../setup_amplify_backend/create_function.md)
- [IoT Device Management](../setup_amplify_backend/add_device.md/README.md)

## Features

### Real-time Data Dashboard

- **Live Weather Data**: Temperature, humidity, pressure, wind, rainfall
- **Multiple Visualizations**: Cards, charts, and real-time indicators
- **Connection Status**: Visual feedback for IoT connection health
- **Smart Device Monitoring**: UI indicators respond within 3 seconds, notifications sent after 30 seconds offline
- **Error Handling**: Graceful degradation and error recovery

### Dynamic Topic Switching

- **Multi-location Support**: Switch between weather stations
- **Persistent Selection**: User preferences saved locally
- **Real-time Switching**: No page reloads required
- **Clean State Management**: Proper connection cleanup

### Data Processing Pipeline

- **Automated ETL**: Daily processing at midnight UTC+7
- **Step Functions Orchestration**: Crawler → ETL workflow
- **Data Cataloging**: Glue crawler for schema discovery
- **CSV Generation**: Structured datasets per location
- **CloudFront Distribution**: Global CDN for dataset access

### Performance Optimization

- **Shared Connection Management**: Single WebSocket connection for all subscriptions
- **Consolidated Utilities**: Shared hooks and utilities for device status calculations
- **React Optimization**: useMemo for expensive computations, useState+useEffect for real-time updates
- **Memory Efficiency**: Proper subscription management
- **Resource Optimization**: Shared data streams
- **Professional Logging**: Clean console output with appropriate levels

## Architecture Overview

### Real-time Data Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   IoT Devices   │────│   AWS IoT Core   │────│  MQTT Topics    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ React Dashboard │────│ Amplify PubSub   │────│ WebSocket Conn  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Data Processing Pipeline

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  EventBridge    │────│ Step Functions   │────│   Glue Crawler  │
│ (Daily Schedule)│    │   (Orchestrator) │    │ (Schema Detect) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudFront    │────│   S3 Datasets    │────│   Glue ETL Job  │
│     (CDN)       │    │   (CSV Files)    │    │ (Transform Data)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Component Architecture

```
App
├── TopicProvider (Global State)
├── AuthProvider (Authentication)
└── Dashboard
    ├── TopicSelector (Dynamic Switching)
    ├── DataCards (Centralized useIoT Hook)
    │   ├── Temperature Card (Offline Detection)
    │   ├── Humidity Card (Stale Data Indicators)
    │   ├── Pressure Card (Real-time Updates)
    │   └── Wind Cards (Status Indicators)
    └── Charts (Centralized useIoT Hook)
        ├── Wind Chart (Status Indicators)
        └── Rain Chart (Offline Detection)
```

## Technical Implementation

### Key Patterns

#### 1. Centralized IoT Hook

```tsx
// Single hook for all IoT data
const {
  weatherData,
  windData,
  rainData,
  error,
  isLoading
} = useIoT();

// Components consume specific data
<WeatherCard data={weatherData} error={error} isLoading={isLoading} />
<WindChart data={windData} />
<RainChart data={rainData} />
```

#### 2. Dynamic Topic Subscription

```tsx
useEffect(() => {
  const subscription = setupIoTSubscription(selectedTopic);
  return () => subscription.unsubscribe();
}, [selectedTopic]); // Re-run when topic changes
```

#### 3. Context-based State Management

```tsx
const TopicContext = createContext<TopicContextType>();

// Global topic state with persistence
const { selectedTopic, setSelectedTopic } = useTopicContext();
```

#### 4. Offline Status Detection

```tsx
// Real-time staleness detection
const isDataStale = weatherData.timestamp ?
  Date.now() - weatherData.timestamp > 3000 : true;

// Visual indicators
<StatusDot color={isDataStale ? "red" : "green"} />
<StatusText>{isDataStale ? "Offline" : "Live data"}</StatusText>
```

## Common Issues

- Connection troubleshooting
- Performance optimization
- Security best practices
- Data processing pipeline monitoring
- CloudFront cache invalidation
- Feature implementation guides
