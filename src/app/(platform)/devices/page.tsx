import AddDeviceButton from "@/components/platform/devices/addDeviceButton";
import DeviceTable from "@/components/platform/devices/DeviceTable";
import DeviceStatusCard from "@/components/platform/devices/DeviceStatusCard";

export const metadata = {
  title: "Devices",
  description: "Manage your IoT devices",
};

export default function DevicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-3xl font-bold">Devices</h1>
      </div>

      {/* Device actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <AddDeviceButton />
          </div>
        </div>
      </div>

      {/* Device status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <DeviceStatusCard title="Total Devices" icon="all" />
        <DeviceStatusCard title="Online Devices" icon="online" />
        <DeviceStatusCard title="Offline Devices" icon="offline" />
      </div>

      {/* Device table with filter - wrapped in page container */}
      <div className="w-full">
        <DeviceTable />
      </div>
    </div>
  );
}
