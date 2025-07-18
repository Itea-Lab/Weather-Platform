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
import {
  Plus,
  Wifi,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  FileText,
  Key,
  Shield,
  Copy,
} from "lucide-react";
import { useState, useRef } from "react";
import { devices } from "@/lib/deviceData";
import { registerDevice } from "@/lib/api";
import { DeviceRegistrationResponse } from "@/types/device";

type DialogStep = "add-device" | "test-connection";

export default function AddDeviceButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<DialogStep>("add-device");
  const [deviceList, setDeviceList] = useState(devices);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "testing" | "success" | "failed"
  >("idle");

  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationResult, setRegistrationResult] =
    useState<DeviceRegistrationResponse | null>(null);

  // Form refs and state for Select components
  const nameRef = useRef<HTMLInputElement>(null);
  const [groupValue, setGroupValue] = useState("");
  const [typeValue, setTypeValue] = useState("");
  const [deviceFormData, setDeviceFormData] = useState({
    name: "",
    group: "",
    type: "",
  });

  const handleAddDevice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsRegistering(true);

    try {
      const deviceData = {
        deviceName: nameRef.current?.value || "",
        thingGroup:
          groupValue === "weather_station" ? "ITeaWeatherHub" : groupValue,
        connectionType: "MQTTS" as const,
      };

      setDeviceFormData({
        name: deviceData.deviceName,
        group: deviceData.thingGroup,
        type: deviceData.connectionType,
      });

      // Call the Lambda function to register the device
      const result = await registerDevice(deviceData);
      setRegistrationResult(result);
      setCurrentStep("test-connection");
      setConnectionStatus("success"); // Show success immediately after registration
    } catch (error) {
      console.error("Registration failed:", error);
      setConnectionStatus("failed");
      setCurrentStep("test-connection");
    } finally {
      setIsRegistering(false);
    }
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
          group: deviceFormData.group,
          connectionType: deviceFormData.type as "MQTTS",
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

  const downloadFile = (
    content: string,
    filename: string,
    contentType: string = "text/plain"
  ) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAllCredentials = () => {
    if (!registrationResult) return;

    const { certificates, thingName } = registrationResult;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const deviceNameClean = thingName.replace(/[^a-zA-Z0-9]/g, "_");

    // Download certificate
    downloadFile(
      certificates.certificatePem,
      `${deviceNameClean}_certificate_${timestamp}.pem`,
      "application/x-pem-file"
    );

    // Download private key
    downloadFile(
      certificates.privateKey,
      `${deviceNameClean}_private_key_${timestamp}.pem`,
      "application/x-pem-file"
    );

    // Download public key
    downloadFile(
      certificates.publicKey,
      `${deviceNameClean}_public_key_${timestamp}.pem`,
      "application/x-pem-file"
    );

    // Download connection info as JSON
    const connectionInfo = {
      deviceName: thingName,
      endpoint: registrationResult.deviceConnectionInfo.endpoint,
      port: registrationResult.deviceConnectionInfo.port,
      protocol: registrationResult.deviceConnectionInfo.protocol,
      topics: registrationResult.deviceConnectionInfo.topics,
      certificateArn: certificates.certificateArn,
    };

    downloadFile(
      JSON.stringify(connectionInfo, null, 2),
      `${deviceNameClean}_connection_info_${timestamp}.json`,
      "application/json"
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCurrentStep("add-device");
    setConnectionStatus("idle");
    setDeviceFormData({ name: "", group: "", type: "" });
    // Reset form refs and state
    if (nameRef.current) nameRef.current.value = "";
    setGroupValue("");
    setTypeValue("");
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
                  ref={nameRef}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#a8cd89] focus:border-[#a8cd89]"
                  placeholder="e.g., Edge station"
                  required
                />
              </div>
              <div className="grid gap-2">
                <label
                  className="block text-md font-medium text-gray-700"
                  htmlFor="group"
                >
                  Things Group
                </label>
                <Select
                  name="group"
                  value={groupValue}
                  onValueChange={setGroupValue}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-md">
                    <SelectItem value="ITeaWeatherHub">
                      ITeaWeatherHub
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
                <Select
                  name="type"
                  value={typeValue}
                  onValueChange={setTypeValue}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select connection type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-md">
                    <SelectItem value="MQTTS">MQTTS</SelectItem>
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
              <DialogTitle className="flex items-center gap-2">
                {connectionStatus === "success" ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-[#a8cd89]" />
                    Device Registered Successfully!
                  </>
                ) : connectionStatus === "failed" ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    Registration Failed
                  </>
                ) : (
                  "Test Connection"
                )}
              </DialogTitle>
              <DialogDescription>
                {connectionStatus === "success"
                  ? `Your device "${deviceFormData.name}" has been registered. Download the credentials below.`
                  : connectionStatus === "failed"
                  ? "There was an error registering your device. Please try again."
                  : `Testing connection to ${deviceFormData.name}. Please wait...`}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Connection Status Indicator */}
              <div className="flex items-center justify-center py-6">
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
                  {registrationResult && (
                    <div>
                      <span className="text-gray-500">Endpoint:</span>
                      <span className="ml-2 text-gray-900 text-xs">
                        {registrationResult.deviceConnectionInfo.endpoint}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Credentials Section - Only show if registration was successful */}
              {connectionStatus === "success" && registrationResult && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Device Credentials
                  </h4>
                  <p className="text-sm text-blue-700 mb-4">
                    These credentials are required for your device to connect
                    securely. Download and store them safely.
                  </p>

                  <div className="grid gap-2 mb-4">
                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">Device Certificate</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          title="Copy certificate to clipboard"
                          onClick={() =>
                            copyToClipboard(
                              registrationResult.certificates.certificatePem
                            )
                          }
                          className="text-gray-600 hover:text-gray-800 text-sm flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() =>
                            downloadFile(
                              registrationResult.certificates.certificatePem,
                              `${deviceFormData.name}_certificate.pem`
                            )
                          }
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">Private Key</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          title="Copy private key to clipboard"
                          onClick={() =>
                            copyToClipboard(
                              registrationResult.certificates.privateKey
                            )
                          }
                          className="text-gray-600 hover:text-gray-800 text-sm flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() =>
                            downloadFile(
                              registrationResult.certificates.privateKey,
                              `${deviceFormData.name}_private_key.pem`
                            )
                          }
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">Public Key</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          title="Copy public key to clipboard"
                          onClick={() =>
                            copyToClipboard(
                              registrationResult.certificates.publicKey
                            )
                          }
                          className="text-gray-600 hover:text-gray-800 text-sm flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() =>
                            downloadFile(
                              registrationResult.certificates.publicKey,
                              `${deviceFormData.name}_public_key.pem`
                            )
                          }
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">Connection Info</span>
                      </div>
                      <button
                        onClick={() =>
                          downloadFile(
                            JSON.stringify(
                              {
                                endpoint:
                                  registrationResult.deviceConnectionInfo
                                    .endpoint,
                                port: registrationResult.deviceConnectionInfo
                                  .port,
                                topics:
                                  registrationResult.deviceConnectionInfo
                                    .topics,
                                certificateArn:
                                  registrationResult.certificates
                                    .certificateArn,
                              },
                              null,
                              2
                            ),
                            `${deviceFormData.name}_connection_info.json`,
                            "application/json"
                          )
                        }
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={downloadAllCredentials}
                    className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download All Credentials
                  </button>
                </div>
              )}

              {/* Warning */}
              {connectionStatus === "success" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Important:</p>
                      <p>
                        Store these credentials securely. The private key cannot
                        be retrieved again.
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                <>
                  <button
                    className="rounded-md bg-white hover:bg-gray-100 mx-2 p-2 transition"
                    type="button"
                    onClick={handleTestConnection}
                  >
                    Test Connection
                  </button>
                  <ActionButton title="Done" onClick={handleCloseDialog} />
                </>
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
