# Hook Optimization: Props Passing vs Multiple Hook Calls

## Overview

This document details a critical performance optimization implemented in the Weather Platform where we reduced IoT connections from 6 to 1 by using props-based data sharing instead of multiple hook calls.

## The Problem: Multiple Hook Calls

### Original Implementation (BEFORE Optimization)

**File**: `src/app/platform/overview/page.tsx` (Before)

```tsx
export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Weather Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Each WeatherCard called useRealtimeWeatherData individually */}
        <WeatherCard
          title="Temperature"
          dataKey="temperature"
          unit="°C"
          icon="temperature"
        />
        <WeatherCard
          title="Humidity"
          dataKey="humidity"
          unit="%"
          icon="humidity"
        />
        ...
      </div>
    </div>
  );
}
```

**File**: `src/components/platform/DataCard.tsx` (Before)

```tsx
export default function WeatherCard({
  title,
  dataKey,
  unit,
  icon,
}: WeatherCardProps) {
  // ❌ PROBLEM: Each card calls the hook individually
  const { data, error, isLoading, isConnected } = useRealtimeWeatherData();

  // Component renders with its own data subscription
  return <div className="card">{/* Render logic */}</div>;
}
```

### Problems with Original Approach

1. **Multiple IoT Connections**: 6 WeatherCard components = 6 separate IoT connections
2. **Resource Waste**: Each connection consumes bandwidth and memory
3. **Synchronization Issues**: Data might arrive at different times
4. **Performance Degradation**: Multiple WebSocket connections impact performance
5. **Debugging Complexity**: Console flooded with duplicate connection logs

### Connection Analysis (Before)

```
WeatherCard[Temperature]  → useRealtimeWeatherData() → IoT Connection #1
WeatherCard[Humidity]     → useRealtimeWeatherData() → IoT Connection #2
WeatherCard[Pressure]     → useRealtimeWeatherData() → IoT Connection #3
WeatherCard[Wind Speed]   → useRealtimeWeatherData() → IoT Connection #4
WeatherCard[Max Wind]     → useRealtimeWeatherData() → IoT Connection #5
WeatherCard[Wind Dir]     → useRealtimeWeatherData() → IoT Connection #6

Total: 6 IoT Connections for the same weather data
```

## The Solution: Props-Based Data Sharing

### Optimized Implementation (AFTER Optimization)

**File**: `src/app/platform/overview/page.tsx` (After)

```tsx
"use client";

import WeatherCard from "@/components/platform/DataCard";
import { useRealtimeWeatherData } from "@/hooks/useRealtimeWeatherData";

export default function OverviewPage() {
  // SOLUTION: Single hook call at parent level
  const { data, error, isLoading, isConnected } = useRealtimeWeatherData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Weather Dashboard</h1>
        <TopicSelector />
      </div>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pass data as props to each card */}
          <WeatherCard
            title="Temperature"
            dataKey="temperature"
            unit="°C"
            icon="temperature"
            data={data}
            error={error}
            isLoading={isLoading}
            isConnected={isConnected}
          />
          <WeatherCard
            title="Humidity"
            dataKey="humidity"
            unit="%"
            icon="humidity"
            data={data}
            error={error}
            isLoading={isLoading}
            isConnected={isConnected}
          />
          ...
        </div>
      </section>
    </div>
  );
}
```

**File**: `src/components/platform/DataCard.tsx` (After)

```tsx
interface WeatherCardProps {
  title: string;
  dataKey: keyof cardData;
  unit: string;
  icon?: string;
  // Accept data as props instead of calling hook
  data?: cardData | null;
  error?: Error | null;
  isLoading?: boolean;
  isConnected?: boolean;
}

export default function WeatherCard({
  title,
  dataKey,
  unit,
  icon,
  // -------Received from parent--------
  data,
  error,
  isLoading,
  isConnected,
}: WeatherCardProps) {

  const getIcon = () => {
    switch (icon) {
      case "temperature":
        return <Thermometer />;
      case "humidity":
        return <Droplets />;
      case "barometric":
        return <Gauge />;
      case "windSpeed":
        return <Wind />;
      case "windDirection":
        return <Compass />;
      default:
        return <ChartNoAxesCombined />;
    }
  };

  const formatValue = (value: number | undefined): string => {
    if (value === undefined || value === null) return "--";
    if (dataKey === "windDirection") {
      const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      const index = Math.round(value / 45) % 8;
      return `${directions[index]} (${value}°)`;
    }
    return value.toFixed(1);
  };

  // Component logic using passed props
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-300">
        <div className="flex items-center justify-between">
          <div className="animate-pulse">Loading...</div>
          <div className="text-gray-400">{getIcon()}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
            <p className="text-red-500 text-sm">Connection Error</p>
          </div>
          <div className="text-red-400">{getIcon()}</div>
        </div>
      </div>
    );
  }

  const currentValue = data?.[dataKey];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[#a8cd89]">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
            <div className="flex items-center">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatValue(currentValue)}
            <span className="text-lg font-normal text-gray-500">{unit}</span>
          </p>
          {data?.timestamp && (
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {format(new Date(data.timestamp), "HH:mm:ss")}
            </p>
          )}
        </div>
        <div className="text-[#a8cd89]">{getIcon()}</div>
      </div>
    </div>
  );
}
```

### Optimized Connection Analysis (After)

```
OverviewPage → useRealtimeWeatherData() → Single IoT Connection
     ↓
   props
     ↓
WeatherCard[Temperature]  ← data prop (no hook call)
WeatherCard[Humidity]     ← data prop (no hook call)
WeatherCard[Pressure]     ← data prop (no hook call)
WeatherCard[Wind Speed]   ← data prop (no hook call)
WeatherCard[Max Wind]     ← data prop (no hook call)
WeatherCard[Wind Dir]     ← data prop (no hook call)

Total: 1 IoT Connection shared across all components
```

## Performance Comparison

### Before Optimization

- **IoT Connections**: 6 connections for weather data + 2 for charts = 8 total
- **Memory Usage**: High (multiple subscriptions, duplicate connections)
- **Console Logs**: Flooding with 6x duplicate messages
- **Network Traffic**: 6x redundant data for same weather info
- **Synchronization**: Cards might show different data timing

### After Optimization

- **IoT Connections**: 1 connection for weather data + 2 for charts = 3 total
- **Memory Usage**: Low (single subscription, shared data)
- **Console Logs**: Clean, single connection message
- **Network Traffic**: Optimal (single data stream)
- **Synchronization**: All cards show identical, synchronized data

### Metrics

| Metric            | Before       | After   |
| ----------------- | ------------ | ------- |
| IoT Connections   | 8            | 3       |
| Memory Usage      | High         | Low     |
| Console Messages  | 6x duplicate | Clean   |
| Network Bandwidth | 6x redundant | Optimal |
| Load Time         | Slower       | Faster  |

## Implementation Strategy

### Step 1: Identify the Pattern

```tsx
// ❌ Anti-pattern: Multiple hook calls for same data
function ComponentA() {
  const data = useExpensiveHook(); // Creates connection #1
  return <div>{data.value}</div>;
}

function ComponentB() {
  const data = useExpensiveHook(); // Creates connection #2
  return <div>{data.value}</div>;
}
```

### Step 2: Move Hook to Parent

```tsx
// Single hook call at parent level
function ParentComponent() {
  const data = useExpensiveHook(); // Single connection

  return (
    <div>
      <ComponentA data={data} />
      <ComponentB data={data} />
    </div>
  );
}
```

### Step 3: Update Child Interfaces

```tsx
interface ComponentProps {
  data?: DataType;
  error?: Error;
  isLoading?: boolean;
}

function ComponentA({ data, error, isLoading }: ComponentProps) {
  // Use props instead of hook
  return <div>{data?.value}</div>;
}
```

### Step 4: Convert to Client Component (if needed)

```tsx
// Add "use client" if parent needs to use hooks
"use client";

export default function ParentComponent() {
  const hookData = useClientSideHook();
  // ...
}
```

## Monitoring and Debugging

### 1. Connection Monitoring

```tsx
useEffect(() => {
  console.log("Creating IoT connection for:", selectedTopic);

  return () => {
    console.log("Cleaning up IoT connection for:", selectedTopic);
  };
}, [selectedTopic]);
```

### 2. Performance Monitoring

```tsx
// Track render counts
const renderCount = useRef(0);

useEffect(() => {
  renderCount.current += 1;
  console.log(`Component rendered ${renderCount.current} times`);
});
```

### 3. Memory Leak Detection

```tsx
// Check for proper cleanup
useEffect(() => {
  const subscription = subscribe();

  return () => {
    if (subscription) {
      subscription.unsubscribe();
      console.log("Subscription cleaned up successfully");
    }
  };
}, []);
```
