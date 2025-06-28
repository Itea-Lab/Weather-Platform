"use client";

import ActionButton from "@/components/platform/ActionButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Wifi, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { devices } from "@/lib/deviceData";

type DialogStep = "add-device" | "test-connection";

export default function AddDeviceButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<DialogStep>("add-device");
  const [deviceList, setDeviceList] = useState(devices);
  const [deviceFormData, setDeviceFormData] = useState({
    name: "",
    description: "",
    group: "",
    type: "",
  });
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "testing" | "success" | "failed"
  >("idle");

  const handleAddDevice = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const deviceData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      group: formData.get("group") as string,
      type: formData.get("type") as string,
    };
    setDeviceFormData(deviceData);
    setCurrentStep("test-connection");
  };

  const handleTestConnection = async () => {
    setConnectionStatus("testing");

    // Simulate connection test
    setTimeout(() => {
      const isSuccess = Math.random() > 0.5; // 50% success rate for demo
      if (isSuccess) {
        setConnectionStatus("success");
        // Add device to list after successful connection
        const newDevice = {
          id: `device-${Date.now()}`,
          name: deviceFormData.name,
          description: deviceFormData.description,
          group: deviceFormData.group,
          connectionType: deviceFormData.type as "mqtts",
          status: "online" as const,
          lastSeen: new Date().toISOString(),
          signalStrength: -45,
        };
        setDeviceList([...deviceList, newDevice]);
      } else {
        setConnectionStatus("failed");
      }
    }, 2000);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCurrentStep("add-device");
    setConnectionStatus("idle");
    setDeviceFormData({ name: "", description: "", group: "", type: "" });
  };

  const handleRetryConnection = () => {
    setConnectionStatus("idle");
  };

  const handleBackToDeviceForm = () => {
    setCurrentStep("add-device");
    setConnectionStatus("idle");
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <ActionButton title="Add device" icon={<Plus className="w-4 h-4" />} />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {currentStep === "add-device" ? (
          <form onSubmit={handleAddDevice}>
            <DialogHeader>
              <DialogTitle>Add New Device</DialogTitle>
              <DialogDescription>
                Connect a new IoT device to your platform. Fill in the device
                information below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label
                  htmlFor="name"
                  className="block text-md font-medium text-gray-700"
                >
                  Device Name
                </label>
                <input
                  id="name"
                  name="name"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#a8cd89] focus:border-[#a8cd89]"
                  placeholder="e.g., Edge station"
                  required
                />
              </div>
              <div className="grid gap-2">
                <label
                  htmlFor="description"
                  className="block text-md font-medium text-gray-700"
                >
                  Description
                </label>
                <input
                  id="description"
                  name="description"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#a8cd89] focus:border-[#a8cd89]"
                  placeholder="Brief description of the device"
                />
              </div>
              <div className="grid gap-2">
                <label
                  className="block text-md font-medium text-gray-700"
                  htmlFor="group"
                >
                  Things Group
                </label>
                <Select name="group" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-md">
                    <SelectItem value="weather_station">
                      Weather Station
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label
                  className="block text-md font-medium text-gray-700"
                  htmlFor="type"
                >
                  Connection Type
                </label>
                <Select name="type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select connection type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-md">
                    <SelectItem value="mqtts">MQTTS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <button
                className="rounded-md bg-white hover:bg-gray-100 mx-2 p-2 transition"
                type="button"
                onClick={handleCloseDialog}
              >
                Cancel
              </button>
              <ActionButton title="Add Device" type="submit" />
            </DialogFooter>
          </form>
        ) : (
          // Test Connection Step
          <div>
            <DialogHeader>
              <DialogTitle>Test Connection</DialogTitle>
              <DialogDescription>
                Testing connection to {deviceFormData.name}. Please wait while
                we verify the device connection.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center justify-center py-8">
                {connectionStatus === "idle" && (
                  <div className="text-center">
                    <Wifi className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Ready to test connection
                    </p>
                  </div>
                )}
                {connectionStatus === "testing" && (
                  <div className="text-center">
                    <Loader2 className="w-16 h-16 mx-auto mb-4 text-[#a8cd89] animate-spin" />
                    <p className="text-sm text-gray-600">
                      Testing connection...
                    </p>
                  </div>
                )}
                {connectionStatus === "success" && (
                  <div className="text-center">
                    <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-[#a8cd89]" />
                    <p className="text-sm text-[#688055] font-medium">
                      Connection successful!
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Device has been added to your platform
                    </p>
                  </div>
                )}
                {connectionStatus === "failed" && (
                  <div className="text-center">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                    <p className="text-sm text-red-600 font-medium">
                      Connection failed
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Please check device settings and try again
                    </p>
                  </div>
                )}
              </div>
              {/* Device Information Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  Device Information:
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2 text-gray-900">
                      {deviceFormData.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-2 text-gray-900">
                      {deviceFormData.type?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Group:</span>
                    <span className="ml-2 text-gray-900">
                      {deviceFormData.group}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              {connectionStatus === "idle" && (
                <>
                  <button
                    className="rounded-md bg-white hover:bg-gray-100 mx-2 p-2 transition"
                    type="button"
                    onClick={handleBackToDeviceForm}
                  >
                    Back
                  </button>
                  <ActionButton
                    title="Test Connection"
                    onClick={handleTestConnection}
                  />
                </>
              )}
              {connectionStatus === "testing" && (
                <button
                  className="rounded-md bg-gray-200 mx-2 p-2 cursor-not-allowed"
                  disabled
                >
                  Testing...
                </button>
              )}
              {connectionStatus === "success" && (
                <ActionButton title="Done" onClick={handleCloseDialog} />
              )}
              {connectionStatus === "failed" && (
                <>
                  <button
                    className="rounded-md bg-white hover:bg-gray-100 mx-2 p-2 transition"
                    type="button"
                    onClick={handleBackToDeviceForm}
                  >
                    Back to Form
                  </button>
                  <ActionButton title="Retry" onClick={handleRetryConnection} />
                </>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
