export default function LineagePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Token Lineage</h1>
      <div className="bg-muted p-4 rounded-lg">
        <p>Lineage components are available for integration.</p>
        <p className="text-sm text-muted-foreground">Use LineageTable, D3TokenTree, or CompactTokenTree with your TokenLineage data.</p>
      </div>
    </div>
  );
}