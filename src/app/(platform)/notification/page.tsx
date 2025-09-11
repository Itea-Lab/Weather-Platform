export const metadata = {
  title: "Notifications",
  description: "View your notifications and alerts",
};

export default function NotificationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Notifications</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">No notifications at this time.</p>
      </div>
    </div>
  );
}