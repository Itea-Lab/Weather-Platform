"use client";

import { useState, useEffect } from "react";
import { Download, MapPin, Clock } from "lucide-react";
import DatasetFilters from "./DataFilter";

interface WeatherDataset {
  id: string;
  stationName: string;
  location: string;
  lastUpdate: string;
  dataSize: string;
  recordCount: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  district: string;
}

const mockWeatherData: WeatherDataset[] = [
  {
    id: "ws001",
    stationName: "Central Weather Station",
    location: "District 1, Ho Chi Minh City",
    lastUpdate: "2024-01-15T14:30:15Z",
    dataSize: "2.4 GB",
    recordCount: 125847,
    temperature: 28.5,
    humidity: 75,
    windSpeed: 12.3,
    district: "District 1",
  },
  {
    id: "ws002",
    stationName: "Industrial Zone Monitor",
    location: "Thu Duc City, Ho Chi Minh City",
    lastUpdate: "2024-01-15T14:29:45Z",
    dataSize: "1.8 GB",
    recordCount: 89234,
    temperature: 30.2,
    humidity: 68,
    windSpeed: 8.7,
    district: "Thu Duc",
  },
  {
    id: "ws003",
    stationName: "Coastal Weather Hub",
    location: "District 7, Ho Chi Minh City",
    lastUpdate: "2024-01-15T14:28:30Z",
    dataSize: "1.2 GB",
    recordCount: 67891,
    temperature: 27.8,
    humidity: 82,
    windSpeed: 15.6,
    district: "District 7",
  },
  {
    id: "ws004",
    stationName: "Agricultural Sensors",
    location: "Cu Chi District, Ho Chi Minh City",
    lastUpdate: "2024-01-15T14:25:10Z",
    dataSize: "890 MB",
    recordCount: 45623,
    temperature: 26.4,
    humidity: 88,
    windSpeed: 5.2,
    district: "Cu Chi",
  },
  {
    id: "ws005",
    stationName: "Urban Climate Station",
    location: "District 3, Ho Chi Minh City",
    lastUpdate: "2024-01-15T13:45:20Z",
    dataSize: "3.7 GB",
    recordCount: 234567,
    temperature: 29.1,
    humidity: 72,
    windSpeed: 9.8,
    district: "District 3",
  },
  {
    id: "ws006",
    stationName: "Port Weather Network",
    location: "District 4, Ho Chi Minh City",
    lastUpdate: "2024-01-15T14:31:05Z",
    dataSize: "1.5 GB",
    recordCount: 156789,
    temperature: 28.9,
    humidity: 79,
    windSpeed: 18.2,
    district: "District 4",
  },
  {
    id: "ws007",
    stationName: "Airport Weather Station",
    location: "Tan Binh District, Ho Chi Minh City",
    lastUpdate: "2024-01-15T14:27:20Z",
    dataSize: "2.1 GB",
    recordCount: 98765,
    temperature: 31.2,
    humidity: 65,
    windSpeed: 11.4,
    district: "Tan Binh",
  },
  {
    id: "ws008",
    stationName: "Suburban Monitor",
    location: "Binh Tan District, Ho Chi Minh City",
    lastUpdate: "2024-01-15T14:15:35Z",
    dataSize: "1.6 GB",
    recordCount: 76543,
    temperature: 27.3,
    humidity: 85,
    windSpeed: 6.9,
    district: "Binh Tan",
  },
];

export default function DatasetTable() {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filteredData, setFilteredData] = useState<WeatherDataset[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let filtered = mockWeatherData.filter(
      (station) =>
        station.stationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.district.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const dateA = new Date(a.lastUpdate).getTime();
      const dateB = new Date(b.lastUpdate).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    setFilteredData(filtered);
  }, [searchTerm, sortOrder]);

  const handleFilterChange = (filters: {
    search: string;
    sortOrder: "asc" | "desc";
  }) => {
    setSearchTerm(filters.search);
    setSortOrder(filters.sortOrder);
  };

  const formatLastUpdate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else {
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const handleDownload = (stationName: string) => {
    console.log(`Downloading weather data for ${stationName}`);
    // TODO: Implement actual download functionality
  };

  return (
    <div className="space-y-6">
      <DatasetFilters
        sortOrder={sortOrder}
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Station
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Update
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
              {filteredData.length > 0 ? (
                filteredData.map((station, index) => (
                  <tr key={station.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {station.stationName}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">
                            {station.location}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {station.recordCount.toLocaleString()} records
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{formatLastUpdate(station.lastUpdate)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="font-medium text-gray-900">
                        {station.dataSize}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <button
                        onClick={() => handleDownload(station.stationName)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <Download className="h-3 w-3" />
                        Export
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <p className="text-lg font-medium">No stations found</p>
                      <p className="text-sm">
                        Check your search filters or try again
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
