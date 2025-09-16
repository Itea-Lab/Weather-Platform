"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/AuthContext";
import { useNotifications } from "@/hooks/NotificationContext";
import { useState, useEffect } from "react";
import {
  House,
  LayoutDashboard,
  Cpu,
  Database,
  MessageSquareDot,
  LogOut,
  Menu,
  X,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadCount, isLoading } = useNotifications();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    {
      name: "Home",
      path: "/home",
      icon: <House />,
    },
    {
      name: "Notification",
      path: "/notification",
      icon: <MessageSquareDot />,
    },
    { name: "Devices", path: "/devices", icon: <Cpu /> },
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard />,
    },
    { name: "Dataset", path: "/dataset", icon: <Database /> },
  ];

  const isActivePath = (path: string) => {
    return pathname === path;
  };

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        isMobileMenuOpen &&
        !target.closest(".sidebar-container") &&
        !target.closest(".mobile-menu-button")
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-button fixed top-4 left-4 z-50 lg:hidden bg-[#4D5E3F] text-white p-2 rounded-md shadow-lg"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar-container bg-[#4D5E3F] text-white w-64 h-screen flex flex-col fixed lg:sticky top-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:transform-none ${
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-4 flex flex-col h-full overflow-hidden">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-center truncate">
              ITea StratoLink
            </h2>
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
                    {item.path === "/notification" && (
                      <>
                        {isLoading ? (
                          <div className="ml-auto w-5 h-5 bg-gray-400 rounded-full animate-pulse"></div>
                        ) : (
                          unreadCount > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )
                        )}
                      </>
                    )}
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
    </>
  );
}
