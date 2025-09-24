import DatasetTable from "@/components/platform/dataset/DataTable";

export const metadata = {
  title: "Datasets",
  description: "Browse and manage your datasets",
};

export default function DatasetsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-3xl font-bold">Datasets</h1>
        
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <DatasetTable />
        </div>
      </div>
    </div>
  );
}
