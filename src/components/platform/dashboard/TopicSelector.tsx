"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useTopicContext } from "@/hooks/TopicContext";
import { clearAllIoTCache } from "@/lib/iotConfig";

export default function TopicSelector() {
  const { selectedTopic, setSelectedTopic, availableTopics } =
    useTopicContext();
  const [isOpen, setIsOpen] = useState(false);

  const selectedTopicInfo = availableTopics.find(
    (topic) => topic.value === selectedTopic
  );

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
    <div className="relative w-full sm:w-auto sm:min-w-[300px]">
      <div className="relative">
        <button
          type="button"
          className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#a8cd89] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="font-medium truncate w-full">
              {selectedTopicInfo?.label}
            </span>
            <span className="text-xs text-gray-500 truncate w-full">
              {selectedTopicInfo?.description}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            <div className="py-1">
              {availableTopics.map((topic) => (
                <button
                  key={topic.value}
                  type="button"
                  className="relative flex w-full items-center py-2 px-3 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  onClick={() => handleTopicChange(topic.value)}
                >
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="font-medium truncate w-full">
                      {topic.label}
                    </span>
                    <span className="text-xs text-gray-500 truncate w-full">
                      {topic.description}
                    </span>
                  </div>
                  {selectedTopic === topic.value && (
                    <Check className="ml-2 h-4 w-4 text-[#a8cd89] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
