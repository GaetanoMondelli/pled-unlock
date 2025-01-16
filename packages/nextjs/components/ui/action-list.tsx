"use client"

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import pledData from "@/public/pled.json";
import { formatTemplateContent } from "@/components/ui/template-content";

interface ActionListProps {
  procedureId: string;
}

export default function ActionList({ procedureId }: ActionListProps) {
  const [expandedActions, setExpandedActions] = useState<string[]>([]);

  const toggleAction = (actionId: string) => {
    setExpandedActions(prev => 
      prev.includes(actionId) 
        ? prev.filter(id => id !== actionId)
        : [...prev, actionId]
    );
  };

  const instance = pledData.procedureInstances.find(p => p.instanceId === procedureId);
  if (!instance) return null;

  const template = pledData.procedureTemplates.find(t => t.templateId === instance.templateId);
  if (!template) return null;

  return (
    <div className="space-y-8 mr-4">
      {/* Action Templates - Collapsible */}
      <div>
        <h3 className="font-semibold mb-4">Action Templates</h3>
        <div className="space-y-2">
          {Object.entries(template.actions).map(([state, actions]) => (
            <Card key={state} className="p-2">
              <Button
                variant="ghost"
                className="w-full flex justify-between items-center"
                onClick={() => toggleAction(state)}
              >
                <span className="text-sm">State: {state}</span>
                {expandedActions.includes(state) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              
              {expandedActions.includes(state) && (
                <div className="p-2 space-y-4">
                  {actions.map((action, index) => (
                    <div key={index} className="bg-muted rounded-md p-2">
                      <p className="text-sm mb-2">Type: {action.type}</p>
                      <div className="space-y-1">
                        {Object.entries(action.template).map(([key, value]) => (
                          <pre key={key} className="text-xs">
                            {formatTemplateContent(`${key}: ${value}`, instance.variables)}
                          </pre>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Completed Actions - Table with Modal */}
      <div>
        <h3 className="font-semibold mb-4">Completed Actions</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instance.completedActions.map((action) => (
              <TableRow key={action.id}>
                <TableCell className="text-xs">
                  {new Date(action.timestamp).toLocaleString()}
                </TableCell>
                <TableCell>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {action.type}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    action.result.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {action.result.success ? 'Success' : 'Failed'}
                  </span>
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Action Details</DialogTitle>
                      </DialogHeader>
                      <pre className="text-xs bg-muted p-4 rounded-md overflow-auto">
                        {JSON.stringify(action.result.data, null, 2)}
                      </pre>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

