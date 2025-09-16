"use client";

import Sidebar from "@/components/platform/Sidebar";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { TopicProvider } from "@/hooks/TopicContext";
import { NotificationProvider } from "@/hooks/NotificationContext";
import { TelemetryProvider } from "@/hooks/TelemetryContext";
import { useDeviceStatusMonitoring } from "@/hooks/useDeviceStatusMonitoring";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize device status monitoring for the entire platform
  useDeviceStatusMonitoring();

  return (
    <ProtectedRoute>
      <TopicProvider>
        <NotificationProvider>
          <TelemetryProvider>
            <div className="flex min-h-screen bg-gray-100">
              <Sidebar />
              <div className="flex-1 p-8 overflow-x-hidden">{children}</div>
            </div>
          </TelemetryProvider>
        </NotificationProvider>
      </TopicProvider>
    </ProtectedRoute>
  );
}
