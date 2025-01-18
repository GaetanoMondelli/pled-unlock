"use client"

import { useEffect, useState } from "react"
import { Card } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Event } from "../../types/events"
import { Play, RotateCcw } from "lucide-react"

export default function EventsPage() {
  const [events, setEvents] = useState<Record<string, any>>({});
  const [receivedEvents, setReceivedEvents] = useState<Event[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      setEvents(data.events);
      setReceivedEvents(data.receivedEvents);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const triggerEvent = async (eventKey: string, event: any) => {
    try {
      setIsProcessing(true);
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: {
            id: `${event.id}-${Date.now()}`,
            type: event.type,
            source: event.template.source,
            data: event.template.data,
          },
          action: 'receive'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger event');
      }

      await fetchEvents(); // Refresh the events list
    } catch (error) {
      console.error('Error triggering event:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const revertEvent = async (event: Event) => {
    try {
      setIsProcessing(true);
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event,
          action: 'revert'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to revert event');
      }

      await fetchEvents(); // Refresh the events list
    } catch (error) {
      console.error('Error reverting event:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async (template: any) => {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: template,
          action: 'add_template'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      // Refresh events list
      await fetchEvents();
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Events</h1>
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Available Events</h2>
          <div className="space-y-4">
            {Object.entries(events).map(([key, event]: [string, any]) => (
              <div key={key} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{event.name}</h3>
                    <p className="text-sm text-gray-500">{event.description}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {event.type}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        event.received ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        {event.received ? 'Received' : 'Not Received'}
                      </span>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => triggerEvent(key, event)}
                    disabled={isProcessing}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
                <pre className="text-xs mt-2 bg-gray-50 p-2 rounded overflow-auto">
                  {JSON.stringify(event.template.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Received Events</h2>
          <div className="space-y-4">
            {receivedEvents.map((event) => (
              <div key={event.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{event.type}</h3>
                    <span className="text-sm text-gray-500 block">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => revertEvent(event)}
                    disabled={isProcessing}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                {event.triggeredTransitions?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium">Triggered Transitions:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {event.triggeredTransitions.map((transition, i) => (
                        <span key={i} className="text-xs bg-blue-100 px-2 py-1 rounded">
                          {transition}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <pre className="text-xs mt-2 bg-gray-50 p-2 rounded overflow-auto">
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
} 