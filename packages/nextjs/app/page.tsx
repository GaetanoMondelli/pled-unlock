"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Building2, 
  Calendar, 
  MessageCircle, 
  Activity,
  GitBranch,
  Timer
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import pledData from "@/public/pled.json";
import { calculateCurrentState } from "@/lib/fsm"

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

// Add the date formatting helper
const formatDate = (dateString?: string) => {
  if (!dateString) return 'No date';
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

export default function Home() {
  const formatTimestamp = (timestamp: string) => {
    try {
      return `Updated ${formatDistanceToNow(new Date(timestamp))} ago`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date error';
    }
  };

  return (
    <div className="container mx-auto p-6">
      {pledData.procedureTemplates.map((template) => (
        <div key={template.templateId} className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{template.name}</h2>
          <p className="text-muted-foreground mb-4">{template.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pledData.procedureInstances
              .filter(instance => instance.templateId === template.templateId)
              .map((instance: ProcedureInstance) => {
                const currentState = calculateCurrentState(template.stateMachine.fsl, instance.messages);
                const lastActivity = instance.messages[instance.messages.length - 1]?.timestamp;
                const firstEventDate = instance.events[0]?.timestamp;

                return (
                  <Link 
                    key={instance.instanceId} 
                    href={`/procedures/${instance.instanceId}`}
                  >
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {instance.variables?.candidate?.name || 'Unnamed'}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {instance.variables?.company?.department || 'No department'}
                            </CardDescription>
                          </div>
                          <Badge variant={getStateBadgeVariant(currentState)}>
                            {currentState}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                            <span>{instance.messages.length} msgs</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <span>{instance.events.length} events</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <GitBranch className="h-4 w-4 text-muted-foreground" />
                            <span>{template.templateId}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {instance.events[0]?.timestamp 
                              ? format(new Date(instance.events[0].timestamp), "MMM d")
                              : "Not started"}
                          </span>
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper function to determine badge variant based on state
function getStateBadgeVariant(state: string): "default" | "secondary" | "destructive" | "outline" {
  switch (state) {
    case 'terminated':
    case 'failure':
      return 'destructive';
    case 'active_employee':
    case 'contract_signed':
      return 'default';
    case 'idle':
      return 'secondary';
    default:
      return 'outline';
  }
}
