import ActionCard from "@/components/platform/home/ActionCard";
import StatisticCard from "@/components/platform/home/StatisticCard";
import RecentActivityCard from "@/components/platform/home/RecentActivityCard";

export const metadata = {
  title: "Home",
  description: "Welcome to the Weather Platform",
};

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome to Weather Platform</h1>
      <section>
        <StatisticCard />
        <ActionCard />
        <RecentActivityCard />
      </section>
    </div>
  );
}
