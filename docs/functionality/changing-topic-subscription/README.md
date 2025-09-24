# Dynamic Topic Subscription System

## Overview

This document explains how we implemented dynamic topic subscription in the Weather Platform, allowing users to switch between different weather data sources in real-time without page reloads.

## Architecture

```
User Selection → Topic Context → IoT Config → PubSub Client → Live Data
```

## Station Location Codes

The platform supports multiple weather stations across Ho Chi Minh City districts:

| Station Code | Station Name        | IoT Topic                              |
| ------------ | ------------------- | -------------------------------------- |
| `district1`  | District 1 Station  | `weatherPlatform/telemetry/district1`  |
| `district2`  | District 2 Station  | `weatherPlatform/telemetry/district2`  |
| `district3`  | District 3 Station  | `weatherPlatform/telemetry/district3`  |
| `district4`  | District 4 Station  | `weatherPlatform/telemetry/district4`  |
| `district5`  | District 5 Station  | `weatherPlatform/telemetry/district5`  |
| `district6`  | District 6 Station  | `weatherPlatform/telemetry/district6`  |
| `district7`  | District 7 Station  | `weatherPlatform/telemetry/district7`  |
| `district8`  | District 8 Station  | `weatherPlatform/telemetry/district8`  |
| `district9`  | District 9 Station  | `weatherPlatform/telemetry/district9`  |
| `district10` | District 10 Station | `weatherPlatform/telemetry/district10` |
| `district11` | District 11 Station | `weatherPlatform/telemetry/district11` |
| `district12` | District 12 Station | `weatherPlatform/telemetry/district12` |
| `districtBT` | Bình Thạnh Station  | `weatherPlatform/telemetry/districtBT` |
| `districtTP` | Tân Phú Station     | `weatherPlatform/telemetry/districtTP` |
| `districtTB` | Tân Bình Station    | `weatherPlatform/telemetry/districtTB` |
| `districtGV` | Gò Vấp Station      | `weatherPlatform/telemetry/districtGV` |
| `districtPN` | Phú Nhuận Station   | `weatherPlatform/telemetry/districtPN` |

### IoT Topic Structure

```
weatherPlatform/telemetry/{stationCode}
```

**Examples:**

- `weatherPlatform/telemetry/district1`
- `weatherPlatform/telemetry/districtBT`
- `weatherPlatform/telemetry/districtTP`

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
    value: "district1",
    label: "District 1 Station",
    description: "weatherPlatform/telemetry/district1",
  },
  {
    value: "districtBT",
    label: "Bình Thạnh Station",
    description: "weatherPlatform/telemetry/districtBT",
  },
  {
    value: "districtTP",
    label: "Tân Phú Station",
    description: "weatherPlatform/telemetry/districtTP",
  },
  // ... more district topics
];

const TopicContext = createContext<TopicContextType | undefined>(undefined);

export function TopicProvider({ children }: { children: React.ReactNode }) {
  const [selectedTopic, setSelectedTopic] = useState<string>("district5");

  // Persist selection in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("selectedIoTTopic");
    if (saved) {
      setSelectedTopic(saved);
    }
  }, []);

  const contextSetSelectedTopic = (topic: string) => {
    setSelectedTopic(topic);
    localStorage.setItem("selectedIoTTopic", topic);
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

**Available Topics:**

| Station Code | Station Name       |
| ------------ | ------------------ |
| `district1`  | District 1 Station |
| `district2`  | District 2 Station |
| `districtBT` | Bình Thạnh Station |
| `districtTP` | Tân Phú Station    |
| `districtTB` | Tân Bình Station   |
| `districtGV` | Gò Vấp Station     |
| `districtPN` | Phú Nhuận Station  |

### 3. Dynamic IoT Configuration

**File**: `src/lib/iotConfig.ts`

```typescript
// Cache management for different topics
const iotConfigCache = new Map<string, any>();
const weatherTopicCache = new Map<string, string>();

export async function getIoTConfig(selectedTopic: string = "district5") {
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

  const topic = `weatherPlatform/telemetry/${selectedTopic}`;
  weatherTopicCache.set(selectedTopic, topic);
  return topic;
}

export function clearAllIoTCache(): void {
  iotConfigCache.clear();
  weatherTopicCache.clear();
}
```

**Topic Examples:**

- `getWeatherTopic("district1")` → `"weatherPlatform/telemetry/district1"`
- `getWeatherTopic("districtBT")` → `"weatherPlatform/telemetry/districtBT"`
- `getWeatherTopic("districtTP")` → `"weatherPlatform/telemetry/districtTP"`

### 4. IoT Topics Configuration

**File**: `src/config/iotTopics.ts`

```typescript
export const IOT_TOPICS = {
  // Main weather telemetry topic pattern (use + for wildcard to catch all districts)
  WEATHER_TELEMETRY_ALL: "weatherPlatform/telemetry/+",

  // Specific device topics by district
  DISTRICT_1: "weatherPlatform/telemetry/district1",
  DISTRICT_2: "weatherPlatform/telemetry/district2",
  DISTRICT_3: "weatherPlatform/telemetry/district3",
  DISTRICT_4: "weatherPlatform/telemetry/district4",
  DISTRICT_5: "weatherPlatform/telemetry/district5",
  DISTRICT_6: "weatherPlatform/telemetry/district6",
  DISTRICT_7: "weatherPlatform/telemetry/district7",
  DISTRICT_8: "weatherPlatform/telemetry/district8",
  DISTRICT_9: "weatherPlatform/telemetry/district9",
  DISTRICT_10: "weatherPlatform/telemetry/district10",
  DISTRICT_11: "weatherPlatform/telemetry/district11",
  DISTRICT_12: "weatherPlatform/telemetry/district12",
  DISTRICT_BT: "weatherPlatform/telemetry/districtBT", //Bình Thạnh
  DISTRICT_TP: "weatherPlatform/telemetry/districtTP", //Tân Phú
  DISTRICT_TB: "weatherPlatform/telemetry/districtTB", //Tân Bình
  DISTRICT_GV: "weatherPlatform/telemetry/districtGV", //Gò Vấp
  DISTRICT_PN: "weatherPlatform/telemetry/districtPN", //Phú Nhuận

  // Notification topics for device status and alerts
  NOTIFICATIONS: "weatherPlatform/notifications",
} as const;
```

### Topic Mapping Table

| Constant Name | Station Code | Full Topic                             |
| ------------- | ------------ | -------------------------------------- |
| `DISTRICT_1`  | `district1`  | `weatherPlatform/telemetry/district1`  |
| `DISTRICT_2`  | `district2`  | `weatherPlatform/telemetry/district2`  |
| `DISTRICT_3`  | `district3`  | `weatherPlatform/telemetry/district3`  |
| `DISTRICT_4`  | `district4`  | `weatherPlatform/telemetry/district4`  |
| `DISTRICT_5`  | `district5`  | `weatherPlatform/telemetry/district5`  |
| `DISTRICT_BT` | `districtBT` | `weatherPlatform/telemetry/districtBT` |
| `DISTRICT_TP` | `districtTP` | `weatherPlatform/telemetry/districtTP` |
| `DISTRICT_TB` | `districtTB` | `weatherPlatform/telemetry/districtTB` |
| `DISTRICT_GV` | `districtGV` | `weatherPlatform/telemetry/districtGV` |
| `DISTRICT_PN` | `districtPN` | `weatherPlatform/telemetry/districtPN` |

**Key Configuration Points:**

- **Wildcard Subscription**: `weatherPlatform/telemetry/+` catches all district topics
- **Individual Topics**: Each district has its own specific topic
- **Notification System**: Separate topic for device status alerts
- **Backward Compatibility**: Legacy status topics maintained

## Topic Switching Flow

### 1. User Interaction

```
User clicks dropdown → Selects "District 1 Station" → UI updates immediately
```

### 2. Context Update

```
Topic Context → Updates selectedTopic to "district1" → Saves to localStorage
```

### 3. Hook Reactivation

```
useEffect dependency → Detects topic change → Triggers new subscription
```

### 4. Connection Management

```
Old subscription cleanup → New IoT config → New PubSub connection to "weatherPlatform/telemetry/district1"
```

### 5. Data Flow

```
New MQTT topic → Real-time data from District 1 → UI components update
```

## Default Station Selection

The platform defaults to **District 5 Station** (`district5`) if:

1. No previous selection in localStorage
2. Invalid topic stored in localStorage
3. Context initialization without saved preference

```typescript
const [selectedTopic, setSelectedTopic] = useState<string>(() => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("selectedIoTTopic");
    if (saved && AVAILABLE_TOPICS.some((t) => t.value === saved)) {
      return saved;
    }
  }
  return IOT_TOPICS.DISTRICT_5; // Default fallback
});
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
  setSelectedTopic("district5");
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
   - Clear browser cache/localStorage (key: `selectedIoTTopic`)

2. **Data Not Updating**

   - Confirm IoT device is publishing to new topic (e.g., `weatherPlatform/telemetry/district1`)
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

// Example outputs:
console.log("Generated topic for district1:", getWeatherTopic("district1"));
// Output: "weatherPlatform/telemetry/district1"

console.log("Generated topic for districtBT:", getWeatherTopic("districtBT"));
// Output: "weatherPlatform/telemetry/districtBT"
```
