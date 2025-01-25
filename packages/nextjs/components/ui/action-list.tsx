"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  ChevronRight, 
  Trash2, 
  Activity, 
  Mail, 
  Calendar, 
  Bell, 
  FileSignature,
  Plus
} from "lucide-react";
import { fetchFromDb } from "~~/utils/api";
import { TemplateVariable } from "./template-variable";
import { Textarea } from "./textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

// Define action type icons mapping
const actionIcons: Record<string, any> = {
  "SEND_EMAIL": Mail,
  "CREATE_CALENDAR_EVENT": Calendar,
  "SEND_REMINDER": Bell,
  "DOCUSIGN_SEND": FileSignature,
  "CUSTOM_EVENT": Activity,
};

const defaultActionIcon = ChevronRight;

interface ActionListProps {
  procedureId: string;
}

export const ActionList = ({ procedureId }: ActionListProps) => {
  const [instance, setInstance] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [showAddAction, setShowAddAction] = useState(false);
  const [newAction, setNewAction] = useState({ state: '', eventData: '{}' });
  const [expandedActions, setExpandedActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Single data fetch on mount or procedureId change
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const data = await fetchFromDb();
        if (!mounted) return;

        const instance = data.procedureInstances?.find((p: any) => p.instanceId === procedureId);
        const template = data.procedureTemplates?.find(
          (t: any) => t.templateId === instance?.templateId
        );

        setInstance(instance);
        setTemplate(template);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [procedureId]); // Only re-fetch when procedureId changes

  // For actions that modify data, use a refresh function
  const refreshData = async () => {
    const data = await fetchFromDb();
    const instance = data.procedureInstances?.find((p: any) => p.instanceId === procedureId);
    const template = data.procedureTemplates?.find(
      (t: any) => t.templateId === instance?.templateId
    );
    
    setInstance(instance);
    setTemplate(template);
  };

  const handleDeleteAction = async (state: string, actionId: string) => {
    try {
      const response = await fetch('/api/actions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedureId,
          state,
          actionId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete action');
      }

      await refreshData(); // Refresh only after modification
    } catch (error) {
      console.error('Error deleting action:', error);
    }
  };

  const handleSaveAction = async () => {
    try {
      let eventData;
      try {
        eventData = JSON.parse(newAction.eventData);
      } catch (e) {
        console.error('Invalid JSON');
        return;
      }

      // Simplified action template
      const actionTemplate = {
        id: `action_${Date.now()}`,
        type: eventData.type || 'CUSTOM_EVENT',
        enabled: true, // Add enabled flag
        template: {
          source: "action",
          data: eventData
        }
      };

      const response = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          procedureId,
          triggerState: newAction.state,
          event: actionTemplate
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save action');
      }

      await refreshData(); // Refresh only after modification
      setShowAddAction(false);
      setNewAction({ state: '', eventData: '{}' });
    } catch (error) {
      console.error('Error saving action:', error);
    }
  };

  if (!instance || !template) return null;

  const toggleActions = (state: string) => {
    setExpandedActions(prev =>
      prev.includes(state)
        ? prev.filter(s => s !== state)
        : [...prev, state]
    );
  };

  const actionEntries = Object.entries(template.actions || {}).map(([state, actions]) => {
    console.log(`Actions for state ${state}:`, actions);
    return {
      state,
      actions: Array.isArray(actions) ? actions : [actions]
    };
  });

  const renderTemplateValue = (key: string, value: string) => {
    // Special handling for arrays (like attendees)
    if (Array.isArray(value)) {
      return value.map((v, i) => (
        <TemplateVariable 
          key={i} 
          text={v} 
          variables={instance.variables} 
        />
      )).reduce((prev, curr) => (
        <>{prev}, {curr}</>
      ));
    }

    // Handle multiline text (like email body)
    if (key === 'body' || key === 'message') {
      return (
        <div className="whitespace-pre-line">
          <TemplateVariable 
            text={value} 
            variables={instance.variables} 
          />
        </div>
      );
    }

    // Default handling
    return (
      <TemplateVariable 
        text={value.toString()} 
        variables={instance.variables} 
      />
    );
  };

  // Get unique states from the FSM
  const getUniqueStates = () => {
    const fsl = template?.stateMachine?.fsl;
    if (!fsl) return [];
    
    // Get all states from FSM definition
    const stateMatches = fsl.match(/[a-zA-Z_]+/g) || [];
    
    // Filter out transitions and get unique states
    const states = new Set(stateMatches.filter(word => 
      !['to', 'wait_for', 'check', 'send', 'complete', '->', 'retry'].includes(word)
    ));
    
    // Convert to array and sort for consistent ordering
    return Array.from(states).sort();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Actions</h2>
        <Button 
          onClick={() => setShowAddAction(true)}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Action
        </Button>
      </div>

      <Dialog open={showAddAction} onOpenChange={setShowAddAction}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Action</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Trigger State</Label>
              <Select 
                value={newAction.state}
                onValueChange={(value) => setNewAction(prev => ({ ...prev, state: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {getUniqueStates().map((state: string) => (
                    <SelectItem 
                      key={`state-${state}`}
                      value={state}
                    >
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Event Data (JSON)</Label>
              <Textarea 
                value={newAction.eventData}
                onChange={(e) => setNewAction(prev => ({ ...prev, eventData: e.target.value }))}
                placeholder="{ 'type': 'CUSTOM_EVENT', ... }"
                rows={10}
              />
            </div>
            <Button onClick={handleSaveAction}>Save Action</Button>
          </div>
        </DialogContent>
      </Dialog>

      {actionEntries.map(({ state, actions }) => {
        console.log(`Rendering actions for state ${state}:`, actions);
        return (
          <div key={state} className="border rounded-lg">
            <div
              className="p-4 flex justify-between items-center cursor-pointer"
              onClick={() => toggleActions(state)}
            >
              <h3 className="font-medium">{state}</h3>
              <span>{actions.length} actions</span>
            </div>
            
            {expandedActions.includes(state) && (
              <div className="p-4 space-y-6 bg-accent/50">
                {actions.map((action, index) => {
                  const ActionIcon = actionIcons[action.type] || defaultActionIcon;
                  return (
                    <div key={index} className="bg-background rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2">
                          <ActionIcon className="h-5 w-5 text-primary" />
                          <h3 className="font-medium text-primary">
                            {action.type}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={action.enabled}
                            onCheckedChange={async (checked) => {
                              // Update action enabled state
                              const response = await fetch('/api/actions', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  procedureId,
                                  state,
                                  actionId: action.id,
                                  updates: { enabled: checked }
                                })
                              });
                              if (response.ok) {
                                // Refresh data
                                await refreshData();
                              }
                            }}
                          />
                          <Button
                            onClick={() => handleDeleteAction(state, action.id)}
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <pre className="text-sm bg-accent/50 p-2 rounded">
                        {JSON.stringify(action.template, null, 2)}
                      </pre>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ActionList;

