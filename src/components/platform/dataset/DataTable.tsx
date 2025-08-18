"use client";

import { useState } from "react";
import DatasetFilters from "./DataFilter";

export default function DatasetTable() {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleFilterChange = (filters: {
    search: string;
    sortOrder: "asc" | "desc";
  }) => {
    setSortOrder(filters.sortOrder);
    console.log("Filter changed:", filters);
  };

  return (
    <div className="space-y-6">
      <DatasetFilters
        sortOrder={sortOrder}
        onFilterChange={handleFilterChange}
      />

      <div className="bg-white shadow-md rounded-lg p-8 text-center">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Dataset View Coming Soon
          </h3>
          <p className="text-gray-600 mb-4">
            This feature is being migrated to use real-time data from AWS IoT
            Core. Historical data viewing will be available in a future update.
          </p>
          <div className="text-sm text-blue-600 bg-blue-50 rounded-lg p-3">
            <strong>Current Status:</strong> Migrated from InfluxDB to real-time
            IoT streaming. Historical data persistence is under development.
          </div>
        </div>
      </div>
    </div>
  );
}
