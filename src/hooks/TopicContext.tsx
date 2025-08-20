"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { IOT_TOPICS } from "@/config/iotTopics";

// Available topics for selection
export const AVAILABLE_TOPICS = [
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
    value: IOT_TOPICS.DISTRICT_1,
    label: "District 1 Station",
    description: "weatherPlatform/telemetry/district1",
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
