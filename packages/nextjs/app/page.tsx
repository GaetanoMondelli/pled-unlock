"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import pledData from "@/public/pled.json";

interface ProcedureInstance {
  instanceId: string;
  templateId: string;
  startDate?: string;
  variables: {
    candidate: {
      email: string;
      name: string;
    };
    company: {
      email: string;
      department: string;
    };
  };
  currentState: string;
  events: Array<{
    id: string;
    type: string;
    timestamp: string;
    data: Record<string, any>;
  }>;
  messages: Array<{
    id: string;
    type: string;
    timestamp: string;
    title: string;
    content: string;
    fromEvent: string;
  }>;
  completedActions: Array<{
    id: string;
    type: string;
    timestamp: string;
    result: Record<string, any>;
  }>;
}

export default function Home() {
  return (
    <div className="container mx-auto p-6">
      {pledData.procedureTemplates.map((template) => (
        <div key={template.templateId} className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{template.name}</h2>
          <p className="text-muted-foreground mb-4">{template.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pledData.procedureInstances
              .filter(instance => instance.templateId === template.templateId)
              .map((instance: ProcedureInstance) => (
                <Link 
                  key={instance.instanceId} 
                  href={`/procedures/${instance.instanceId}`}
                >
                  <Card className="p-4 hover:shadow-lg transition-shadow">
                    <h3 className="font-semibold mb-2">
                      {instance.variables?.candidate?.name || 'Unnamed'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {instance.variables?.company?.department || 'No department specified'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Started: {instance.startDate ? instance?.startDate : 'Not started'}
                    </p>
                    <div className="mt-2 inline-block px-2 py-1 text-xs bg-secondary rounded-full">
                      {instance.currentState}
                    </div>
                  </Card>
                </Link>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
