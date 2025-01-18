"use client"

import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";
import { Event, EventTemplate } from "../../types/events";
import { CreateEventModal } from "./CreateEventModal";

const SAMPLE_EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: "docusign-signed",
    name: "DocuSign Contract Signed",
    description: "Triggered when candidate signs the contract",
    type: "docusign_webhook",
    template: {
      source: "docusign",
      data: {
        envelopeStatus: "completed",
        envelopeId: "sample-id",
        recipientStatus: ["completed"]
      }
    }
  },
  {
    id: "candidate-email",
    name: "Candidate Response Email",
    description: "Email response from candidate",
    type: "email",
    template: {
      source: "gmail",
      data: {
        subject: "Re: Employment Contract",
        from: "candidate@example.com",
        body: "I accept the offer"
      }
    }
  },
  {
    id: "api-success",
    name: "API Success Response",
    description: "Successful API response from external service",
    type: "api_response",
    template: {
      source: "external-api",
      data: {
        status: 200,
        response: {
          success: true,
          message: "Operation completed successfully"
        }
      }
    }
  }
];

export const EventsPlayground = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [templates, setTemplates] = useState<EventTemplate[]>(SAMPLE_EVENT_TEMPLATES);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEventProcessing = async (event: Event, isReceived: boolean) => {
    try {
      setIsProcessing(true);
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event,
          action: isReceived ? 'receive' : 'revert'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process event');
      }

      const result = await response.json();
      console.log('Event processing result:', result);
      
      // Update event with new state
      const updatedEvent = {
        ...event,
        processed: isReceived,
        triggeredTransitions: result.transitions || []
      };

      return updatedEvent;
    } catch (error) {
      console.error('Error processing event:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    try {
      if (result.source.droppableId === "templates" && 
          result.destination.droppableId === "events") {
        // Create new event from template
        const template = templates.find(t => t.id === result.draggableId);
        if (template) {
          const newEvent: Event = {
            id: `${template.id}-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: template.type,
            source: template.template.source,
            data: template.template.data,
            processed: false,
            triggeredTransitions: []
          };

          // Process the event through the API
          const processedEvent = await handleEventProcessing(newEvent, true);
          setEvents([...events, processedEvent]);
        }
      } else if (result.source.droppableId === "events" && 
                 result.destination.droppableId === "templates") {
        // Revert event
        const eventToRevert = events.find(e => e.id === result.draggableId);
        if (eventToRevert) {
          await handleEventProcessing(eventToRevert, false);
          setEvents(events.filter(e => e.id !== eventToRevert.id));
        }
      }
    } catch (error) {
      console.error('Error in drag and drop:', error);
      // Show error to user
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Templates Section */}
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Event Templates</h2>
            <Button onClick={() => setShowCreateModal(true)} disabled={isProcessing}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
          <Droppable droppableId="templates">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {templates.map((template, index) => (
                  <Draggable
                    key={template.id}
                    draggableId={template.id}
                    index={index}
                    isDragDisabled={isProcessing}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`border rounded p-3 bg-white shadow-sm hover:shadow-md transition-shadow ${
                          isProcessing ? 'opacity-50' : ''
                        }`}
                      >
                        <h3 className="font-medium">{template.name}</h3>
                        <p className="text-sm text-gray-500">
                          {template.description}
                        </p>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                          {template.type}
                        </span>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* Received Events Section */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Received Events</h2>
          <Droppable droppableId="events">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {events.map((event, index) => (
                  <Draggable
                    key={event.id}
                    draggableId={event.id}
                    index={index}
                    isDragDisabled={isProcessing}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`border rounded p-3 bg-white shadow-sm ${
                          isProcessing ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {event.type}
                            </span>
                            <p className="text-sm mt-1">
                              {new Date(event.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2 py-1 rounded ${
                              event.processed ? 'bg-green-100' : 'bg-yellow-100'
                            }`}>
                              {event.processed ? 'Processed' : 'Pending'}
                            </span>
                          </div>
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
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>

      <CreateEventModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={(template) => {
          setTemplates([...templates, template]);
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}; 