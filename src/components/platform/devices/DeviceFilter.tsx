export default function DeviceFilter() {
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
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#688055] focus:border-[#688055] bg-white min-w-[120px]"
        >
          <option value="">All Groups</option>
          <option value="outdoor_sensors">Outdoor Sensors</option>
          <option value="indoor_sensors">Indoor Sensors</option>
          <option value="sensor_hubs">Sensor Hubs</option>
          <option value="weather_sensors">Weather Sensors</option>
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
