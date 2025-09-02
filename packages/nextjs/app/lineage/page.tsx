import LineageTableDemo from "@/components/lineage/LineageTableDemo";

export default function LineagePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Token Lineage</h1>
      <LineageTableDemo />
    </div>
  );
}