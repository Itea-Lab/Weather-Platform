# Dynamic Topic Subscription System

## Overview

This document explains how we implemented dynamic topic subscription in the Weather Platform, allowing users to switch between different weather data sources in real-time without page reloads.

## Architecture

```
User Selection → Topic Context → IoT Config → PubSub Client → Live Data
```

## Implementation Components

### 1. Topic Context Provider

**File**: `src/hooks/TopicContext.tsx`

```typescript
interface TopicOption {
  value: string;
  label: string;
  description: string;
  location: string;
}

const availableTopics: TopicOption[] = [
  {
    value: "hcmc",
    label: "Ho Chi Minh City",
    description: "Southern Vietnam",
    location: "10.8231° N, 106.6297° E",
  },
  {
    value: "hanoi",
    label: "Hanoi",
    description: "Northern Vietnam",
    location: "21.0285° N, 105.8542° E",
  },
  // ... more topics
];

const TopicContext = createContext<TopicContextType | undefined>(undefined);

export function TopicProvider({ children }: { children: React.ReactNode }) {
  const [selectedTopic, setSelectedTopic] = useState<string>("hcmc");

  // Persist selection in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("selectedWeatherTopic");
    if (saved) {
      setSelectedTopic(saved);
    }
  }, []);

  const contextSetSelectedTopic = (topic: string) => {
    setSelectedTopic(topic);
    localStorage.setItem("selectedWeatherTopic", topic);
    console.log("Topic changed to:", topic);
  };

  return (
    <TopicContext.Provider
      value={{
        selectedTopic,
        setSelectedTopic: contextSetSelectedTopic,
        availableTopics,
      }}
    >
      {children}
    </TopicContext.Provider>
  );
}
```

### 2. Topic Selector Component

**File**: `src/components/platform/TopicSelector.tsx`

```typescript
export default function TopicSelector() {
  const { selectedTopic, setSelectedTopic, availableTopics } =
    useTopicContext();
  const [isOpen, setIsOpen] = useState(false);

  const handleTopicChange = (topicValue: string) => {
    console.log(
      "Topic selection changed from",
      selectedTopic,
      "to",
      topicValue
    );

    setSelectedTopic(topicValue);
    setIsOpen(false);

    // Clear ALL IoT-related caches and connections
    clearAllIoTCache();

    // Force a page refresh to ensure clean connection state
    setTimeout(() => {
      window.location.reload();
    }, 500); // Small delay to ensure state is updated
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between rounded-md border bg-white px-3 py-2"
      >
        <div className="flex flex-col items-start">
          <span className="font-medium">{selectedTopicInfo?.label}</span>
          <span className="text-xs text-gray-500">
            {selectedTopicInfo?.description}
          </span>
        </div>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 w-full rounded-md border bg-white shadow-lg">
          {availableTopics.map((topic) => (
            <button
              key={topic.value}
              onClick={() => handleTopicChange(topic.value)}
              className="flex w-full items-center justify-between px-3 py-2 hover:bg-gray-50"
            >
              <div className="flex flex-col items-start">
                <span className="font-medium">{topic.label}</span>
                <span className="text-xs text-gray-500">
                  {topic.description}
                </span>
              </div>
              {selectedTopic === topic.value && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Features**:

- **Visual Feedback**: Shows current selection with checkmark
- **Cache Clearing**: Ensures clean state transitions
- **Page Refresh**: Guarantees proper reconnection

### 3. Dynamic IoT Configuration

**File**: `src/lib/iotConfig.ts`

```typescript
// Cache management for different topics
const iotConfigCache = new Map<string, any>();
const weatherTopicCache = new Map<string, string>();

export async function getIoTConfig(selectedTopic: string = "hcmc") {
  // Check cache first
  if (iotConfigCache.has(selectedTopic)) {
    return iotConfigCache.get(selectedTopic);
  }

  try {
    const response = await fetch("/api/iot/endpoint", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const config = {
      region: data.region, // Use dynamic region from API response
      endpoint: `wss://${data.endpoint}/mqtt`,
    };

    // Cache the configuration
    iotConfigCache.set(selectedTopic, config);
    return config;
  } catch (error) {
    throw new Error(`Failed to get IoT configuration: ${error}`);
  }
}

export function getWeatherTopic(selectedTopic: string): string {
  // Check cache first
  if (weatherTopicCache.has(selectedTopic)) {
    return weatherTopicCache.get(selectedTopic)!;
  }

  const topic = `weather/${selectedTopic}`;
  weatherTopicCache.set(selectedTopic, topic);
  return topic;
}

export function clearAllIoTCache(): void {
  iotConfigCache.clear();
  weatherTopicCache.clear();
}
```

**Benefits**:

- **Caching**: Reduces API calls for repeated topic switches
- **Error Handling**: Graceful failure with meaningful errors
- **Cache Management**: Ability to clear cache for fresh connections

## Topic Switching Flow

### 1. User Interaction

```
User clicks dropdown → Selects new topic → UI updates immediately
```

### 2. Context Update

```
Topic Context → Updates selectedTopic → Saves to localStorage
```

### 3. Hook Reactivation

```
useEffect dependency → Detects topic change → Triggers new subscription
```

### 4. Connection Management

```
Old subscription cleanup → New IoT config → New PubSub connection
```

### 5. Data Flow

```
New MQTT topic → Real-time data → UI components update
```

## Subscription Management

### 1. Hook Dependencies

```typescript
useEffect(() => {
  // Setup subscription logic
}, [selectedTopic]); // Re-run when topic changes
```

### 2. Cleanup Process

```typescript
return () => {
  if (subscription) {
    subscription.unsubscribe();
  }
};
```

### 3. State Reset

When topic changes:

- Loading state resets to `true`
- Error state clears
- Connection state resets
- Previous data remains until new data arrives

## Error Handling

### 1. Invalid Topic Selection

```typescript
const selectedTopicInfo = availableTopics.find(
  (topic) => topic.value === selectedTopic
);

if (!selectedTopicInfo) {
  // Fallback to default topic
  setSelectedTopic("hcmc");
}
```

### 2. Connection Failures

```typescript
error: (err: any) => {
  console.error("Topic subscription error:", err);
  setError(new Error(`Failed to connect to ${selectedTopic}: ${err.message}`));
};
```

### 3. Invalid Data

```typescript
try {
  const weatherData = transformWeatherMessage(messageData);
  setData(weatherData);
} catch (parseError) {
  console.error("Data parsing error:", parseError);
  setError(new Error("Invalid data format received"));
}
```

## Troubleshooting

### Common Issues

1. **Topic Switch Not Working**

   - Check context provider wrapping
   - Verify useEffect dependencies
   - Clear browser cache/localStorage

2. **Data Not Updating**

   - Confirm IoT device is publishing to new topic
   - Check WebSocket connection status
   - Verify topic permissions in AWS IoT

3. **Performance Issues**
   - Monitor subscription cleanup
   - Check for memory leaks
   - Review caching effectiveness

### Debug Steps

```typescript
// Enable debug logging
console.log("Current topic:", selectedTopic);
console.log("Available topics:", availableTopics);
console.log("IoT config:", iotConfig);
console.log("Generated topic:", getWeatherTopic(selectedTopic));
```
