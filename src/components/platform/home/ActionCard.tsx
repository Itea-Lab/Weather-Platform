import {
  BarChart3,
  Database,
  Plus,
  Settings,
  MessageSquareDot,
} from "lucide-react";

import Link from "next/link";

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
}

export default function ActionCard() {
  const actions: ActionCardProps[] = [
    {
      title: "Add Device",
      description: "Register a new device",
      icon: <Plus className="w-6 h-6 text-green-500" />,
      to: "/platform/devices",
    },
    {
      title: "View Notifications",
      description: "Check your notifications",
      icon: <MessageSquareDot className="w-6 h-6 text-red-500" />,
      to: "/platform/notification",
    },
    {
      title: "Manage Datasets",
      description: "Manage your datasets",
      icon: <Database className="w-6 h-6 text-purple-500" />,
      to: "/platform/dataset",
    },
    {
      title: "View Dashboard",
      description: "Monitor your real-time data",
      icon: <BarChart3 className="w-6 h-6 text-blue-500" />,
      to: "/platform/dashboard",
    },
  ];
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-2xl font-bold tracking-tight mb-1">Quick Actions</h2>
      <p className="text-sm text-gray-500 mb-6">
        Quickly access common tasks and features
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {actions.map((action, index) => (
          <div
            className="bg-slate-50 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            key={index}
          >
            <Link href={action.to} className="flex flex-col items-center">
              <div className="flex items-center gap-4 p-3">
                <div className="mb-2 text-gray-700">{action.icon}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
