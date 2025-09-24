"use client";

import { useState } from "react";

interface DeviceFilterProps {
  onGroupChange?: (group: string) => void;
  onStatusChange?: (status: string) => void;
}

export default function DeviceFilter({
  onGroupChange,
  onStatusChange,
}: DeviceFilterProps) {
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedGroup(value);
    onGroupChange?.(value);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedStatus(value);
    onStatusChange?.(value);
  };

  return (
    <div className="flex flex-col md:flex-row items-start sm:items-start gap-3 sm:gap-4">
      <div className="flex items-center gap-2">
        <label
          htmlFor="group"
          className="text-sm font-medium text-gray-700 whitespace-nowrap"
        >
          Group:
        </label>
        <select
          id="group"
          value={selectedGroup}
          onChange={handleGroupChange}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#688055] focus:border-[#688055] bg-white min-w-[120px]"
        >
          <option value="">All Groups</option>
          <option value="ITeaWeatherHub">ITeaWeatherHub</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label
          htmlFor="status"
          className="text-sm font-medium text-gray-700 whitespace-nowrap"
        >
          Status:
        </label>
        <select
          id="status"
          value={selectedStatus}
          onChange={handleStatusChange}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#688055] focus:border-[#688055] bg-white min-w-[100px]"
        >
          <option value="">All Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
      </div>
    </div>
  );
}
