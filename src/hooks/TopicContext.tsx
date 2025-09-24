"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { IOT_TOPICS } from "@/config/iotTopics";

// Available topics for selection
export const AVAILABLE_TOPICS = [
  {
    value: IOT_TOPICS.DISTRICT_1,
    label: "District 1 Station",
    description: "weatherPlatform/telemetry/district1",
  },
  {
    value: IOT_TOPICS.DISTRICT_2,
    label: "District 2 Station",
    description: "weatherPlatform/telemetry/district2",
  },
  {
    value: IOT_TOPICS.DISTRICT_3,
    label: "District 3 Station",
    description: "weatherPlatform/telemetry/district3",
  },
  {
    value: IOT_TOPICS.DISTRICT_4,
    label: "District 4 Station",
    description: "weatherPlatform/telemetry/district4",
  },
  {
    value: IOT_TOPICS.DISTRICT_5,
    label: "District 5 Station",
    description: "weatherPlatform/telemetry/district5",
  },
  {
    value: IOT_TOPICS.DISTRICT_6,
    label: "District 6 Station",
    description: "weatherPlatform/telemetry/district6",
  },
  {
    value: IOT_TOPICS.DISTRICT_7,
    label: "District 7 Station",
    description: "weatherPlatform/telemetry/district7",
  },
  {
    value: IOT_TOPICS.DISTRICT_8,
    label: "District 8 Station",
    description: "weatherPlatform/telemetry/district8",
  },
  {
    value: IOT_TOPICS.DISTRICT_9,
    label: "District 9 Station",
    description: "weatherPlatform/telemetry/district9",
  },
  {
    value: IOT_TOPICS.DISTRICT_10,
    label: "District 10 Station",
    description: "weatherPlatform/telemetry/district10",
  },
  {
    value: IOT_TOPICS.DISTRICT_11,
    label: "District 11 Station",
    description: "weatherPlatform/telemetry/district11",
  },
  {
    value: IOT_TOPICS.DISTRICT_12,
    label: "District 12 Station",
    description: "weatherPlatform/telemetry/district12",
  },
  {
    value: IOT_TOPICS.DISTRICT_BT,
    label: "Bình Thạnh Station",
    description: "weatherPlatform/telemetry/districtBT",
  },
  {
    value: IOT_TOPICS.DISTRICT_TP,
    label: "Tân Phú Station",
    description: "weatherPlatform/telemetry/districtTP",
  },
  {
    value: IOT_TOPICS.DISTRICT_TB,
    label: "Tân Bình Station",
    description: "weatherPlatform/telemetry/districtTB",
  },
  {
    value: IOT_TOPICS.DISTRICT_GV,
    label: "Gò Vấp Station",
    description: "weatherPlatform/telemetry/districtGV",
  },
  {
    value: IOT_TOPICS.DISTRICT_PN,
    label: "Phú Nhuận Station",
    description: "weatherPlatform/telemetry/districtPN",
  },
] as const;

interface TopicContextType {
  selectedTopic: string;
  setSelectedTopic: (topic: string) => void;
  availableTopics: typeof AVAILABLE_TOPICS;
}

const TopicContext = createContext<TopicContextType | undefined>(undefined);

export function TopicProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage or default to District 5
  const [selectedTopic, setSelectedTopic] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedIoTTopic");
      if (saved && AVAILABLE_TOPICS.some((t) => t.value === saved)) {
        return saved;
      }
    }
    return IOT_TOPICS.DISTRICT_5;
  });

  const contextSetSelectedTopic = (topic: string) => {
    console.log("Topic changed to:", topic);
    setSelectedTopic(topic);
    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedIoTTopic", topic);
    }
  };

  return (
    <TopicContext.Provider
      value={{
        selectedTopic,
        setSelectedTopic: contextSetSelectedTopic,
        availableTopics: AVAILABLE_TOPICS,
      }}
    >
      {children}
    </TopicContext.Provider>
  );
}

export function useTopicContext() {
  const context = useContext(TopicContext);
  if (context === undefined) {
    throw new Error("useTopicContext must be used within a TopicProvider");
  }
  return context;
}
