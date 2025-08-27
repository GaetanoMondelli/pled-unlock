export default function TemplateDetailPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-2">Template: {id}</h1>
      <p className="text-sm text-gray-600">This page is under construction.</p>
    </div>
  );
}

