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
import { registerDevice } from "@/lib/api";
import { DeviceRegistrationResponse } from "@/types/device";

type DialogStep = "add-device" | "registration-result";

export default function AddDeviceButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<DialogStep>("add-device");
  const [registrationStatus, setRegistrationStatus] = useState<
    "idle" | "success" | "failed"
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

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddDevice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsRegistering(true);
    setErrorMessage(null);

    try {
      const deviceName = nameRef.current?.value || "";

      // Client-side validation for device name
      const thingNameRegex = /^[a-zA-Z0-9:_-]+$/;
      if (!deviceName) {
        throw new Error("Device name is required");
      }

      if (!thingNameRegex.test(deviceName)) {
        throw new Error(
          "Device name can only contain alphanumeric characters, colons, underscores, and hyphens"
        );
      }

      if (!groupValue) {
        throw new Error("Thing Group is required");
      }

      if (!typeValue) {
        throw new Error("Connection Type is required");
      }

      const deviceData = {
        deviceName,
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
      setCurrentStep("registration-result");
      setRegistrationStatus("success");
    } catch (error) {
      console.error("Registration failed:", error);
      setRegistrationStatus("failed");
      setCurrentStep("registration-result");

      // Extract error message
      if (error instanceof Error) {
        // Check for specific error patterns to provide more user-friendly messages
        if (error.message.includes("already exists")) {
          setErrorMessage(
            `A device with this name already exists. Please choose another name.`
          );
        } else if (error.message.includes("not authorized")) {
          setErrorMessage(
            `Authorization error. Please log out and log in again.`
          );
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage("Unknown error occurred");
      }
    } finally {
      setIsRegistering(false);
    }
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCurrentStep("add-device");
    setRegistrationStatus("idle");
    setDeviceFormData({ name: "", group: "", type: "" });
    setRegistrationResult(null);
    setErrorMessage(null);
    // Reset form refs and state
    if (nameRef.current) nameRef.current.value = "";
    setGroupValue("");
    setTypeValue("");
  };

  const handleRetryConnection = () => {
    setCurrentStep("add-device");
    setRegistrationStatus("idle");
    setErrorMessage(null);
    setRegistrationResult(null);
  };

  const handleBackToDeviceForm = () => {
    setCurrentStep("add-device");
    setRegistrationStatus("idle");
    setErrorMessage(null);
    setRegistrationResult(null);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <ActionButton title="Add device" icon={<Plus className="w-4 h-4" />} />
      </DialogTrigger>
      <DialogContent
        className={
          currentStep === "add-device"
            ? "sm:max-w-[500px]"
            : "sm:max-w-[800px] max-h-[80vh] overflow-y-auto"
        }
      >
        {currentStep === "add-device" ? (
          <form onSubmit={handleAddDevice} noValidate>
            <DialogHeader>
              <DialogTitle>Add New Device</DialogTitle>
              <DialogDescription>
                Connect a new IoT device to your platform. Fill in the device
                information below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-3">
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
                  pattern="[a-zA-Z0-9:_\-]+"
                  title="Device name can only contain alphanumeric characters, colons, underscores, and hyphens"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#a8cd89] focus:border-[#a8cd89]"
                  placeholder="e.g., Edge-station-1"
                  required
                  onChange={(e) => {
                    const input = e.target;
                    const isValid = input.validity.valid;
                    const errorElement = document.getElementById("name-error");
                    if (errorElement) {
                      if (!isValid && input.value) {
                        errorElement.textContent =
                          "Device name can only contain alphanumeric characters, colons, underscores, and hyphens";
                        errorElement.className = "text-xs text-red-500 mt-1";
                      } else {
                        errorElement.textContent =
                          "Only alphanumeric characters, colons, underscores, and hyphens allowed";
                        errorElement.className = "text-xs text-gray-500 mt-1";
                      }
                    }
                  }}
                />
                <p id="name-error" className="text-xs text-gray-500 mt-1">
                  Only alphanumeric characters, colons, underscores, and hyphens
                  allowed
                </p>
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
                disabled={isRegistering}
              >
                Cancel
              </button>
              <ActionButton
                title={isRegistering ? "Registering..." : "Add Device"}
                type="submit"
                disabled={isRegistering}
                icon={
                  isRegistering ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : undefined
                }
              />
            </DialogFooter>
          </form>
        ) : (
          // Registration Results Step
          <div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {registrationStatus === "success" ? (
                  <>Device Registered Successfully!</>
                ) : registrationStatus === "failed" ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    Registration Failed
                  </>
                ) : (
                  "Processing Registration"
                )}
              </DialogTitle>
              <DialogDescription>
                {registrationStatus === "success"
                  ? `Your device "${deviceFormData.name}" has been registered. Download the credentials below.`
                  : registrationStatus === "failed"
                  ? "There was an error registering your device. Please try again."
                  : `Registering ${deviceFormData.name}. Please wait...`}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-3">
              {/* Registration Status Indicator */}
              <div className="flex items-center justify-center py-3">
                {registrationStatus === "success" && (
                  <div className="text-center">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-[#688055]" />
                    <p className="text-sm text-[#688055] font-medium">
                      Registration successful!
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Device has been added to your platform
                    </p>
                  </div>
                )}
                {registrationStatus === "failed" && (
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-500" />
                    <p className="text-sm text-red-600 font-medium">
                      Registration failed
                    </p>
                    {errorMessage && (
                      <div className="mt-2 mb-2 bg-red-50 border border-red-200 rounded-md p-2">
                        <p className="text-sm text-red-700 font-medium">
                          Error:
                        </p>
                        <p className="text-sm text-red-600">{errorMessage}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Please check your input and try again
                    </p>
                  </div>
                )}
              </div>

              {/* Device Information Summary */}
              <div className="bg-gray-50 rounded-lg p-3">
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
                    <div className="col-span-2">
                      <span className="text-gray-500">Endpoint:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-900 text-xs flex-1 font-mono bg-white px-2 py-1 rounded border">
                          {registrationResult.deviceConnectionInfo.endpoint}
                        </span>
                        <button
                          title="Copy endpoint to clipboard"
                          onClick={() =>
                            copyToClipboard(
                              registrationResult.deviceConnectionInfo.endpoint
                            )
                          }
                          className="text-gray-600 hover:text-gray-800 text-sm flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Credentials Section - Only show if registration was successful */}
              {registrationStatus === "success" && registrationResult && (
                <div className="bg-red-50 rounded-lg p-3">
                  <h4 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Device Credentials
                  </h4>
                  <p className="text-sm text-red-700 mb-3">
                    These credentials are required for your device to connect
                    securely. Download and store them safely.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">Certificate</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          title="Copy certificate to clipboard"
                          onClick={() =>
                            copyToClipboard(
                              registrationResult.certificates.certificatePem
                            )
                          }
                          className="text-gray-600 hover:text-gray-800 text-sm p-1"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          title="Download certificate"
                          onClick={() =>
                            downloadFile(
                              registrationResult.certificates.certificatePem,
                              `${deviceFormData.name}_certificate.pem`
                            )
                          }
                          className="text-red-600 hover:text-red-800 text-sm p-1"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">Private Key</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          title="Copy private key to clipboard"
                          onClick={() =>
                            copyToClipboard(
                              registrationResult.certificates.privateKey
                            )
                          }
                          className="text-gray-600 hover:text-gray-800 text-sm p-1"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          title="Download private key"
                          onClick={() =>
                            downloadFile(
                              registrationResult.certificates.privateKey,
                              `${deviceFormData.name}_private_key.pem`
                            )
                          }
                          className="text-red-600 hover:text-red-800 text-sm p-1"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">Public Key</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          title="Copy public key to clipboard"
                          onClick={() =>
                            copyToClipboard(
                              registrationResult.certificates.publicKey
                            )
                          }
                          className="text-gray-600 hover:text-gray-800 text-sm p-1"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          title="Download public key"
                          onClick={() =>
                            downloadFile(
                              registrationResult.certificates.publicKey,
                              `${deviceFormData.name}_public_key.pem`
                            )
                          }
                          className="text-red-600 hover:text-red-800 text-sm p-1"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">Connection Info</span>
                      </div>
                      <button
                        title="Download connection info"
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
                        className="text-red-600 hover:text-red-800 text-sm p-1"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning */}
              {registrationStatus === "success" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
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
              {registrationStatus === "success" && (
                <ActionButton title="Done" onClick={handleCloseDialog} />
              )}
              {registrationStatus === "failed" && (
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
