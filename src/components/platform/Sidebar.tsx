"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/AuthContext";
import {
  House,
  LayoutDashboard,
  Cpu,
  Database,
  MessageSquareDot,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      name: "Home",
      path: "/platform",
      icon: <House />,
    },
    {
      name: "Notification",
      path: "/platform/notification",
      icon: <MessageSquareDot />,
    },
    { name: "Devices", path: "/platform/devices", icon: <Cpu /> },
    {
      name: "Dashboard",
      path: "/platform/overview",
      icon: <LayoutDashboard />,
    },
    { name: "Dataset", path: "/platform/dataset", icon: <Database /> },
  ];

  const isActivePath = (path: string) => {
    return pathname === path;
  };

  return (
    <aside className="bg-[#4D5E3F] text-white w-64 h-screen flex flex-col sticky top-0 left-0 z-40">
      <div className="p-4 flex flex-col h-full overflow-hidden">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-center truncate">Heading</h2>
        </div>

        <div className="mb-6">
          <div className="px-3 py-3 rounded-lg bg-[#688055] mb-4">
            <p className="text-xs opacity-75">Logged in as</p>
            <p className="font-medium text-sm truncate">
              {user?.username || "Loading..."}
            </p>
            <p className="text-xs text-[#A8CD89] truncate">
              {user?.signInDetails?.loginId || "Loading..."}
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center px-3 py-3 rounded-lg hover:bg-[#84A26C] transition-colors text-sm ${
                    isActivePath(item.path) ? "bg-[#688055]" : ""
                  }`}
                >
                  <span className="mr-3 flex-shrink-0">{item.icon}</span>
                  <span className="truncate">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto pt-4">
          <button
            onClick={logout}
            className="w-full flex items-center px-3 py-3 rounded-lg hover:bg-[#84A26C] transition-colors text-sm"
          >
            <span className="mr-3 flex-shrink-0">
              <LogOut />
            </span>
            <span className="truncate">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
