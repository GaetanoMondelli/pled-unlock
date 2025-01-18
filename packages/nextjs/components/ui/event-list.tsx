"use client"

import { useState, useEffect } from "react";
import { Card } from "./card";
import { Button } from "./button";
import { ArrowRight, ArrowLeft, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Event } from "../../types/events";
import { CreateEventModal } from "../events/CreateEventModal";
import { matchEventToRule } from "../../utils/eventMatching";
import pledData from "@/public/pled.json";
import { getValueByPath } from "../../utils/eventMatching";

interface EventListProps {
  procedureId: string;
}

export default function EventList({ procedureId }: EventListProps) {
  const [availableEvents, setAvailableEvents] = useState<Record<string, any>>({});
  const [processedEvents, setProcessedEvents] = useState<Event[]>([]);
  const [selectedAvailable, setSelectedAvailable] = useState<string[]>([]);
  const [selectedProcessed, setSelectedProcessed] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Get the instance
  const instance = pledData.procedureInstances.find(
    p => p.instanceId === procedureId
  );

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      setAvailableEvents(data.events);
      setProcessedEvents(data.receivedEvents);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const toggleEventExpand = (id: string) => {
    setExpandedEvents(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleTransfer = async (direction: 'receive' | 'revert') => {
    setIsProcessing(true);
    try {
      const eventsToProcess = direction === 'receive' 
        ? selectedAvailable.map(key => ({
            id: `${availableEvents[key].id}-${Date.now()}`,
            type: availableEvents[key].type,
            source: availableEvents[key].template.source,
            data: availableEvents[key].template.data,
          }))
        : processedEvents.filter(e => selectedProcessed.includes(e.id));

      await Promise.all(
        eventsToProcess.map(event =>
          fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event, action: direction })
          })
        )
      );

      // Update available events locally
      if (direction === 'receive') {
        setAvailableEvents(prev => {
          const updated = { ...prev };
          selectedAvailable.forEach(key => {
            updated[key] = {
              ...updated[key],
              received: true
            };
          });
          return updated;
        });
      }

      await fetchEvents();
      setSelectedAvailable([]);
      setSelectedProcessed([]);
    } catch (error) {
      console.error(`Error ${direction}ing events:`, error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getMatchingRules = (event: any) => {
    const template = pledData.procedureTemplates.find(
      t => t.templateId === "hiring_process"
    );

    if (!template) return [];

    // Get the instance variables
    const instance = pledData.procedureInstances.find(
      p => p.instanceId === procedureId
    );

    const variables = instance?.variables || {};

    // For available events, we need to convert the template to match event format
    const eventToMatch = event.template ? {
      type: event.type,
      data: event.template.data
    } : event;

    return template.messageRules.filter(rule => 
      matchEventToRule(
        eventToMatch,
        {
          type: rule.matches.type,
          conditions: rule.matches.conditions
        },
        variables
      )
    );
  };

  const renderTransition = (transition: any) => {
    if (typeof transition === 'string') {
      return (
        <span className="text-xs bg-blue-100 px-2 py-0.5 rounded">
          {transition}
        </span>
      );
    }
    
    // If it's an object with 'to' and 'conditions'
    if (transition.to) {
      return (
        <span className="text-xs bg-blue-100 px-2 py-0.5 rounded flex gap-1 items-center">
          <span>{transition.to}</span>
          {transition.conditions && (
            <span className="text-xs bg-blue-200 px-1 rounded">
              with conditions
            </span>
          )}
        </span>
      );
    }

    return null;
  };

  const getCapturedOutputs = () => {
    const instance = pledData.procedureInstances.find(
      p => p.instanceId === procedureId
    );
    
    const outputs: Record<string, Record<string, any>> = {};
    
    // Get all rules with captures
    const template = pledData.procedureTemplates.find(
      t => t.templateId === "hiring_process"
    );
    
    instance?.messages?.forEach(message => {
      const rule = template?.messageRules.find(r => r.id === message.rule);
      if (rule?.captures) {
        // Group by message type
        if (!outputs[message.type]) {
          outputs[message.type] = {};
        }

        Object.entries(rule.captures).forEach(([key, pathTemplate]) => {
          const event = processedEvents.find(e => e.id === message.fromEvent);
          if (event) {
            const pathMatch = pathTemplate.toString().match(/{{event\.data\.(.+)}}/);
            if (pathMatch && pathMatch[1]) {
              const path = pathMatch[1];
              const value = getValueByPath(event.data, path);
              if (value !== undefined) {
                outputs[message.type][key] = value;
              }
            }
          }
        });
      }
    });
    
    return outputs;
  };

  // First, let's combine the instance variables with captured outputs
  const getAllVariables = () => {
    const baseVars = instance?.variables || {};
    const capturedVars = getCapturedOutputs();
    
    // Convert captured vars to match instance variables format
    const capturedFormatted = Object.entries(capturedVars).reduce((acc, [messageType, captures]) => {
      const sectionName = messageType.replace(/_/g, ' ');
      acc[sectionName] = captures;
      return acc;
    }, {} as Record<string, any>);

    return {
      ...baseVars,
      ...capturedFormatted
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-start">
        {/* Available Events */}
        <Card className="flex-1 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Available Events</h3>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-500">
                {selectedAvailable.length}/{Object.keys(availableEvents).length} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {Object.entries(availableEvents)
              .filter(([_, event]) => !event.received)
              .map(([key, event]: [string, any]) => (
                <div key={key} className="border rounded">
                  <div 
                    className={`p-2 cursor-pointer ${
                      selectedAvailable.includes(key) ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedAvailable(prev =>
                        prev.includes(key) 
                          ? prev.filter(k => k !== key)
                          : [...prev, key]
                      );
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{event.name}</span>
                      <div className="flex gap-2 items-center">
                        <span className={`text-xs px-2 py-1 rounded ${
                          event.received ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {event.type}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEventExpand(key);
                          }}
                        >
                          {expandedEvents.includes(key) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  {expandedEvents.includes(key) && (
                    <div className="p-2 border-t bg-gray-50">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(event.template.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </Card>

        {/* Transfer Controls */}
        <div className="flex flex-col gap-2 py-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTransfer('receive')}
            disabled={isProcessing || selectedAvailable.length === 0}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTransfer('revert')}
            disabled={isProcessing || selectedProcessed.length === 0}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Processed Events */}
        <Card className="flex-1 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Processed Events</h3>
            <span className="text-sm text-gray-500">
              {selectedProcessed.length}/{processedEvents.length} selected
            </span>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {processedEvents.map((event) => (
              <div key={event.id} className="border rounded">
                <div 
                  className={`p-2 cursor-pointer ${
                    selectedProcessed.includes(event.id) ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSelectedProcessed(prev =>
                      prev.includes(event.id)
                        ? prev.filter(id => id !== event.id)
                        : [...prev, event.id]
                    );
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{event.type}</span>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEventExpand(event.id);
                        }}
                      >
                        {expandedEvents.includes(event.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {event.triggeredTransitions?.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {event.triggeredTransitions.map((transition, i) => (
                        <div key={i} className="flex gap-1 mt-1">
                          {renderTransition(transition)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {expandedEvents.includes(event.id) && (
                  <div className="p-2 border-t bg-gray-50">
                    {getMatchingRules(event).length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium mb-1">Matching Rules:</p>
                        <div className="flex flex-wrap gap-1">
                          {getMatchingRules(event).map((rule) => (
                            <span 
                              key={rule.id} 
                              className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded"
                            >
                              {rule.id}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">Instance Variables</h3>
        <div className="space-y-4">
          {Object.entries(getAllVariables()).map(([section, vars]) => (
            <div key={section} className="space-y-1">
              <h4 className="text-sm font-medium capitalize">{section}</h4>
              <div className="pl-2 space-y-1">
                {Object.entries(vars).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">{key}:</span>
                    <span className="font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <CreateEventModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={async (template) => {
          try {
            const response = await fetch('/api/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                event: template,
                action: 'create'
              })
            });
            
            if (!response.ok) throw new Error('Failed to create event');
            
            await fetchEvents();
            setShowCreateModal(false);
          } catch (error) {
            console.error('Error creating event:', error);
          }
        }}
      />
    </div>
  );
}

