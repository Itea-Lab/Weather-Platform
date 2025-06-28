"use client";

import Sidebar from "@/components/platform/Sidebar";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 p-8 overflow-x-hidden">{children}</div>
      </div>
    </ProtectedRoute>
  );
}
