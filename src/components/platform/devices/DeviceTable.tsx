"use client";

import { useState, useMemo } from "react";
import { deleteDevice } from "@/lib/api";
import { useDevicesWithStatus } from "@/hooks/useDevicesWithStatus";
import DeviceFilter from "./DeviceFilter";
import { Loader2, AlertCircle, Trash2 } from "lucide-react";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  deviceName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirmDialog({
  isOpen,
  deviceName,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Delete Device</h3>
            <p className="text-sm text-gray-500">
              This action cannot be undone
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-700">
            Are you sure you want to delete <strong>{deviceName}</strong>? This
            will remove the device from the thing group, detach all policies and
            certificates, and permanently delete the device and its credentials.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Device
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeviceTable() {
  const { devices, isLoading, error, mutate } = useDevicesWithStatus();
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    deviceName: string;
  }>({ isOpen: false, deviceName: "" });
  const [deletingDevice, setDeletingDevice] = useState<string | null>(null);

  // Filter devices based on selected filters
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      const matchesGroup = !groupFilter || device.group === groupFilter;
      const matchesStatus =
        !statusFilter || device.realTimeStatus === statusFilter;
      return matchesGroup && matchesStatus;
    });
  }, [devices, groupFilter, statusFilter]);

  const handleDeleteClick = (deviceName: string) => {
    setDeleteDialog({ isOpen: true, deviceName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.deviceName) return;

    setDeletingDevice(deleteDialog.deviceName);
    try {
      await deleteDevice(deleteDialog.deviceName);
      // Refresh the devices list
      await mutate();
      setDeleteDialog({ isOpen: false, deviceName: "" });
    } catch (error) {
      console.error("Failed to delete device:", error);
      // You could add a toast notification here
      alert(
        `Failed to delete device: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setDeletingDevice(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, deviceName: "" });
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <div>
            <h3 className="font-medium">Failed to load devices</h3>
            <p className="text-sm text-red-500">
              {error?.message || "Failed to load devices"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        deviceName={deleteDialog.deviceName}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={deletingDevice === deleteDialog.deviceName}
      />

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
                  : `${filteredDevices.length} devices total`}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
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
                            device.realTimeStatus === "online"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {device.realTimeStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {device.timeSinceUpdate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {device.signalStrength !== 0
                          ? `${device.signalStrength} dBm`
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <button
                          onClick={() => handleDeleteClick(device.name)}
                          disabled={deletingDevice === device.name}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={`Delete ${device.name}`}
                        >
                          {deletingDevice === device.name ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
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
    </>
  );
}
