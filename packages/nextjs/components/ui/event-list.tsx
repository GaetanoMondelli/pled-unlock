"use client"

import { Card } from "@/components/ui/card";
import pledData from "@/public/pled.json";
import { format } from "date-fns";

interface EventListProps {
  procedureId: string;
}

const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), "PPpp");
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

export default function EventList({ procedureId }: EventListProps) {
  const instance = pledData.procedureInstances.find(
    p => p.instanceId === procedureId
  );
  
  if (!instance) return null;

  const template = pledData.procedureTemplates.find(
    t => t.templateId === instance.templateId
  );

  const getEventTime = (event: any) => {
    // For email events, use the time when email was sent
    if (event.type === 'EMAIL_RECEIVED' && event.data.time) {
      return formatDate(event.data.time);
    }
    // For other events, use the system timestamp
    return formatDate(event.timestamp);
  };

  return (
    <div className="space-y-4">
      {instance.events.map((event) => {
        const eventType = template?.eventTypes.find(
          et => et.type === event.type
        );

        return (
          <Card key={event.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">{event.type}</h3>
              <span className="text-xs text-muted-foreground">
                {formatDate(event.timestamp)}
              </span>
            </div>
            <pre className="text-sm bg-muted p-2 rounded-md overflow-auto">
              {JSON.stringify(event.data, null, 2)}
            </pre>
          </Card>
        );
      })}
    </div>
  );
}

