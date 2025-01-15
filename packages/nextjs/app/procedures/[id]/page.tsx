import { notFound } from "next/navigation";
import pledData from "@/public/pled.json";

export default function ProcedurePage({ params }: { params: { id: string } }) {
  const procedure = pledData.procedures.find(p => p.id === params.id);

  if (!procedure) {
    notFound();
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">{procedure.name}</h2>
      <div className="grid gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Events ({procedure.events.length})</h3>
          {procedure.events.map(event => (
            <div key={event.eventId} className="p-3 border rounded-lg mb-2">
              <p className="font-medium">{event.content}</p>
              <p className="text-sm text-muted-foreground">{event.description}</p>
            </div>
          ))}
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Messages ({procedure.messages.length})</h3>
          {procedure.messages.map(message => (
            <div key={message.messageId} className="p-3 border rounded-lg mb-2">
              <p className="font-medium">{message.title}</p>
              <p className="text-sm text-muted-foreground">{message.messageContent}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 