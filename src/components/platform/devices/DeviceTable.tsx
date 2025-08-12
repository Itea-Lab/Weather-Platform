"use client";

import { useState, useMemo } from "react";
import { useDevices } from "@/lib/api";
import DeviceFilter from "./DeviceFilter";
import { Loader2, AlertCircle } from "lucide-react";

export default function DeviceTable() {
  const { devices, totalCount, thingGroup, error, isLoading } = useDevices();
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Filter devices based on selected filters
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      const matchesGroup = !groupFilter || device.group === groupFilter;
      const matchesStatus = !statusFilter || device.status === statusFilter;
      return matchesGroup && matchesStatus;
    });
  }, [devices, groupFilter, statusFilter]);

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <div>
            <h3 className="font-medium">Failed to load devices</h3>
            <p className="text-sm text-red-500">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header section with title and filter */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Connected Devices
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isLoading
                ? "Loading..."
                : `${filteredDevices.length} of ${totalCount} devices in ${thingGroup}`}
            </p>
          </div>
          <DeviceFilter
            onGroupChange={setGroupFilter}
            onStatusChange={setStatusFilter}
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading devices...</span>
        </div>
      )}

      {/* Table section */}
      {!isLoading && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Connection Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Group
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Signal Strength
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDevices.length > 0 ? (
                filteredDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {device.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {device.connectionType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {device.group}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          device.status === "online"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {device.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {device.lastSeen
                        ? new Date(device.lastSeen).toLocaleString()
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {device.signalStrength !== 0
                        ? `${device.signalStrength} dBm`
                        : "N/A"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <p className="text-lg font-medium">No devices found</p>
                      <p className="text-sm">
                        Register your first device to get started
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
