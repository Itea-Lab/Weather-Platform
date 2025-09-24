"use client";

import { useState, useEffect } from "react";
import { Download, MapPin, Clock, RefreshCw } from "lucide-react";
import DatasetFilters from "./DataFilter";
import { useWeatherDatasets, downloadDatasetFile } from "@/lib/api";
import type { DatasetInfo } from "@/types/dataset";

interface WeatherDataset {
  district: string;
  lastUpdate: string;
  dataSize: string;
  url: string;
}

export default function DataTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filteredData, setFilteredData] = useState<WeatherDataset[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch weather datasets from API
  const { datasets, error, isLoading, mutate } = useWeatherDatasets();

  // Convert API response to component data format and apply filters
  useEffect(() => {
    // Early return if datasets is not available
    if (!datasets || typeof datasets !== "object") {
      setFilteredData([]);
      return;
    }

    let filtered = Object.entries(datasets).map(
      ([district, info]: [string, DatasetInfo]) => ({
        district: district.charAt(0).toUpperCase() + district.slice(1),
        lastUpdate: info.latest_update,
        dataSize: info.size_formatted, // Use actual file size from API
        url: info.url,
      })
    );

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.district.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const comparison =
        new Date(a.lastUpdate).getTime() - new Date(b.lastUpdate).getTime();
      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredData(filtered);
  }, [datasets, searchTerm, sortOrder]);

  const handleFilterChange = (filters: {
    search: string;
    sortOrder: "asc" | "desc";
  }) => {
    setSearchTerm(filters.search);
    setSortOrder(filters.sortOrder);
  };

  const formatLastUpdate = (dateString: string) => {
    if (!dateString) return "No data";

    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await mutate();
    } catch (error) {
      console.error("Failed to refresh datasets:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDownload = async (dataset: WeatherDataset) => {
    try {
      const filename = `${dataset.district.toLowerCase()}_weather_data.csv`;
      await downloadDatasetFile(dataset.url, filename);
    } catch (error) {
      console.error("Failed to download dataset:", error);
      // You could add a toast notification here
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 mb-4">
          <p>Failed to load weather datasets</p>
          <p className="text-sm text-gray-500">{error.message}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DatasetFilters
        sortOrder={sortOrder}
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>Station</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Last Update</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Loading weather datasets...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No weather datasets found
                  </td>
                </tr>
              ) : (
                filteredData.map((dataset) => (
                  <tr key={dataset.district} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {dataset.district} Weather Station
                          </div>
                          <div className="text-sm text-gray-500">
                            {dataset.district}, Ho Chi Minh City
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatLastUpdate(dataset.lastUpdate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {dataset.dataSize}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                      <button
                        onClick={() => handleDownload(dataset)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
