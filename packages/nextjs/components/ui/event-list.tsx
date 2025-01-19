"use client"

import { useState, useEffect } from "react";
import { Card } from "./card";
import { Button } from "./button";
import { ArrowRight, ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Event } from "../../types/events";
import { CreateEventModal } from "../events/CreateEventModal";
import { matchEventToRule } from "../../utils/eventMatching";
import { getValueByPath } from "../../utils/eventMatching";

interface EventListProps {
  procedureId: string;
}

export default function EventList({ procedureId }: EventListProps) {
  const [pledData, setPledData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableEvents, setAvailableEvents] = useState<Record<string, any>>({});
  const [processedEvents, setProcessedEvents] = useState<Event[]>([]);
  const [selectedAvailable, setSelectedAvailable] = useState<string[]>([]);
  const [selectedProcessed, setSelectedProcessed] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load JSON data through API
  useEffect(() => {
    const loadPledData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/get-pled-json');
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        setPledData(data);
      } catch (error) {
        console.error('Failed to load pled data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPledData();
  }, []);

  // Get the instance with null check
  const instance = pledData?.procedureInstances?.find(
    p => p.instanceId === procedureId
  );

  useEffect(() => {
    if (pledData && !isLoading) {
      fetchEvents();
    }
  }, [pledData, isLoading]);

  const fetchEvents = async () => {
    if (!pledData?.eventTemplates) return;
    
    try {
      const availableEvts = Object.entries(pledData.eventTemplates)
        .reduce((acc, [key, event]) => {
          if (!event.received) {
            acc[key] = event;
          }
          return acc;
        }, {} as Record<string, any>);

      const processedEvts = instance?.history?.events || [];

      setAvailableEvents(availableEvts);
      setProcessedEvents(processedEvts);
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
    if (!pledData) return;
    
    setIsProcessing(true);
    try {
      const updatedPledData = JSON.parse(JSON.stringify(pledData));
      
      const instanceIndex = updatedPledData.procedureInstances.findIndex(
        p => p.instanceId === procedureId
      );

      if (instanceIndex === -1) {
        throw new Error('Instance not found');
      }

      if (direction === 'receive') {
        // Process selected events
        const eventsToProcess = selectedAvailable.map(key => {
          const event = availableEvents[key];
          return {
            id: `${event.id}-${Date.now()}`,
            type: event.type,
            timestamp: new Date().toISOString(),
            data: event.template.data
          };
        });

        // Update instance history
        if (!updatedPledData.procedureInstances[instanceIndex].history) {
          updatedPledData.procedureInstances[instanceIndex].history = { events: [], messages: [] };
        }
        
        updatedPledData.procedureInstances[instanceIndex].history.events = [
          ...(updatedPledData.procedureInstances[instanceIndex].history.events || []),
          ...eventsToProcess
        ];

        // Mark events as received in eventTemplates
        selectedAvailable.forEach(key => {
          if (updatedPledData.eventTemplates[key]) {
            updatedPledData.eventTemplates[key].received = true;
          }
        });
      } else {
        // Revert: Remove events from processed and their associated messages
        const updatedProcessedEvents = processedEvents.filter(
          event => !selectedProcessed.includes(event.id)
        );
        
        // Update events
        updatedPledData.procedureInstances[instanceIndex].history.events = updatedProcessedEvents;
        
        // Update messages - remove messages associated with the reverted events
        const existingMessages = updatedPledData.procedureInstances[instanceIndex].history.messages || [];
        const updatedMessages = existingMessages.filter(
          message => !selectedProcessed.includes(message.fromEvent)
        );
        
        updatedPledData.procedureInstances[instanceIndex].history.messages = updatedMessages;

        // Mark events as not received in eventTemplates
        selectedProcessed.forEach(eventId => {
          // Find the event template key by matching the event ID pattern
          const templateKey = Object.keys(updatedPledData.eventTemplates).find(key => 
            eventId.startsWith(`${updatedPledData.eventTemplates[key].id}-`)
          );
          if (templateKey) {
            updatedPledData.eventTemplates[templateKey].received = false;
          }
        });
      }

      // Save updated JSON to file
      const saveResponse = await fetch('/api/save-pled-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPledData)
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save JSON');
      }

      // Refresh data from API
      const refreshResponse = await fetch('/api/get-pled-json');
      if (!refreshResponse.ok) throw new Error('Failed to refresh data');
      const refreshedData = await refreshResponse.json();
      
      // Update all state
      setPledData(refreshedData);
      
      // Update available events
      const availableEvts = Object.entries(refreshedData.eventTemplates)
        .reduce((acc, [key, event]) => {
          if (!event.received) {
            acc[key] = event;
          }
          return acc;
        }, {} as Record<string, any>);

      const processedEvts = refreshedData.procedureInstances[instanceIndex].history.events || [];

      setAvailableEvents(availableEvts);
      setProcessedEvents(processedEvts);
      
      // Clear selections
      if (direction === 'receive') {
        setSelectedAvailable([]);
      } else {
        setSelectedProcessed([]);
      }

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

  const handleDeleteEvent = async (eventId: string) => {
    if (!pledData) return;
    
    try {
      const updatedPledData = JSON.parse(JSON.stringify(pledData));
      
      if (updatedPledData.eventTemplates[eventId]) {
        delete updatedPledData.eventTemplates[eventId];
      }

      const saveResponse = await fetch('/api/save-pled-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPledData)
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save JSON');
      }

      // Refresh data from API
      const refreshResponse = await fetch('/api/get-pled-json');
      if (!refreshResponse.ok) throw new Error('Failed to refresh data');
      const refreshedData = await refreshResponse.json();
      
      setPledData(refreshedData);
      setAvailableEvents(prev => {
        const updated = { ...prev };
        delete updated[eventId];
        return updated;
      });

    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        Loading...
      </div>
    );
  }

  if (!pledData) {
    return (
      <div className="flex justify-center items-center p-4">
        Error loading data
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-start">
        {/* Available Events */}
        <Card className="flex-1 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Available Events</h3>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-500">
                {selectedAvailable.length}/{Object.keys(availableEvents || {})?.length || 0} selected
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
            {Object.entries(availableEvents || {})
              .filter(([_, event]) => !event.received)
              .map(([key, event]: [string, any]) => (
                <div key={key} className="border rounded">
                  <div 
                    className={`p-2 ${
                      selectedAvailable.includes(key) ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => {
                        setSelectedAvailable(prev =>
                          prev.includes(key)
                            ? prev.filter(id => id !== key)
                            : [...prev, key]
                        );
                      }}>
                        <span className="font-medium text-sm">{event.type}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(key);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
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
                    {getMatchingRules(event).length > 0 && (
                      <div className="flex gap-1 mt-1">
                        <p className="text-xs font-medium">Matches:</p>
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
              {selectedProcessed.length}/{processedEvents?.length || 0} selected
            </span>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {processedEvents?.map((event) => (
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

