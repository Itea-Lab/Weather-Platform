# Weather Platform Documentation

## Table of Contents

### Core Functionality

- [Real-time Dashboard Implementation](./realtime-dashboard/README.md)
- [Dynamic Topic Subscription System](./changing-topic-subscription/README.md)
- [Hook Optimization: Props Passing Strategy](./hook-props-passing.md)

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
- **Error Handling**: Graceful degradation and error recovery

### Dynamic Topic Switching

- **Multi-location Support**: Switch between weather stations
- **Persistent Selection**: User preferences saved locally
- **Real-time Switching**: No page reloads required
- **Clean State Management**: Proper connection cleanup

### Performance Optimization

- **Connection Reduction**: 6→1 IoT connections via props passing
- **Memory Efficiency**: Proper subscription management
- **Resource Optimization**: Shared data streams
- **Clean Logging**: Security-conscious debug output

## Architecture Overview

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

### Component Architecture

```
App
├── TopicProvider (Global State)
├── AuthProvider (Authentication)
└── Dashboard
    ├── TopicSelector (Dynamic Swi tching)
    ├── DataCards (Props-based Data)
    │   ├── Temperature Card
    │   ├── Humidity Card
    │   ├── Pressure Card
    │   └── Wind Cards
    └── Charts (Separate Subscriptions)
        ├── Wind Chart
        └── Rain Chart
```

## Technical Implementation

### Core Technologies

- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: AWS Amplify Gen 2, Lambda Functions
- **Real-time**: AWS IoT Core, MQTT over WebSockets
- **Authentication**: AWS Cognito
- **State Management**: React Context + useState
- **Styling**: Tailwind CSS, Lucide Icons

### Key Patterns

#### 1. Single Hook + Props Distribution

```tsx
// Parent: Single data source
const { data, error, isLoading } = useRealtimeWeatherData();

// Children: Props-based consumption
<WeatherCard data={data} error={error} isLoading={isLoading} />;
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

## Common Issues

- Connection troubleshooting
- Performance optimization
- Security best practices
- Feature implementation guides