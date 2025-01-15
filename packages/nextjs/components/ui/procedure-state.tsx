"use client"

import { Card } from "@/components/ui/card";
import pledData from "@/public/pled.json";

interface ProcedureStateProps {
  procedureId: string;
}

export default function ProcedureState({ procedureId }: ProcedureStateProps) {
  const instance = pledData.procedureInstances.find(
    p => p.instanceId === procedureId
  );
  
  if (!instance) return null;

  const template = pledData.procedureTemplates.find(
    t => t.templateId === instance.templateId
  );

  if (!template) return null;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Current State</h3>
        <div className="text-lg font-medium text-primary">
          {instance.currentState}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Available States</h3>
        <div className="flex gap-2 flex-wrap">
          {template.stateMachine.states.map((state) => (
            <span 
              key={state}
              className={`px-2 py-1 rounded-full text-sm ${
                state === instance.currentState 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary'
              }`}
            >
              {state}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}

