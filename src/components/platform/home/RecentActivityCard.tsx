import Link from "next/link";

interface Activity {
  id: string;
  type: "sensor" | "alert" | "device" | "platform";
  name: string;
  status?: string;
  value?: string | number;
}

export default function RecentActivityCard() {
  const activities = [
    {
      id: "1",
      type: "sensor",
      name: "Temperature Sensor 1",
      status: "Normal",
      value: "22.5°C",
    },
    {
      id: "2",
      type: "sensor",
      name: "Humidity Sensor 1",
      status: "High",
      value: "75%",
    },
    {
      id: "3",
      type: "sensor",
      name: "Wind Speed Sensor 1",
      status: "Normal",
      value: "15 km/h",
    },
    {
      id: "4",
      type: "sensor",
      name: "Barometric Pressure Sensor 1",
      status: "Low",
      value: "1000 hPa",
    },
    {
      id: "5",
      type: "alert",
      name: "Device Alert 1",
      status: "Critical",
      value: "Device overheating",
    },
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Normal":
        return "bg-green-500";
      case "High":
        return "bg-yellow-500";
      case "Low":
        return "bg-blue-500";
      case "Critical":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-2xl font-bold tracking-tight mb-1">
        Recent Activities
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Latest updates from your devices
      </p>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="bg-slate-50 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer w-full"
          >
            <div className="flex items-center gap-4">
              <span
                className={`inline-block w-3 h-3 rounded-full ${getStatusColor(
                  activity.status
                )}`}
              ></span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {activity.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {activity.type.charAt(0).toUpperCase() +
                    activity.type.slice(1)}
                </p>
                {activity.value && (
                  <p className="text-sm text-gray-500">
                    Value: {activity.value}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Link
          href="/notification"
          className="text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          View All Activities
        </Link>
      </div>
    </div>
  );
}
