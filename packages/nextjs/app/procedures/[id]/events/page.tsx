import pledData from "@/public/pled.json";

export default function EventsPage({ params }: { params: { id: string } }) {
  const procedure = pledData.procedureInstances.find(p => p.instanceId === params.id);
  if (!procedure) return null;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Events</h2>
      <div className="space-y-4">
        {procedure.events.map(event => (
          <div key={event.id} className="p-4 border rounded-lg">
            <p className="font-medium">{event.type}</p>
            <p className="text-sm text-muted-foreground">{event.timestamp}</p>
          </div>
        ))}
      </div>
    </div>
  );
}