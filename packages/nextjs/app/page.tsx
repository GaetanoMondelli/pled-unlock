"use client";

import { useState, useEffect } from "react";
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
import { format } from "date-fns";
import { calculateCurrentState } from "@/lib/fsm"


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
  const [templates, setTemplates] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/db');
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        setTemplates(data.procedureTemplates || []);
        setInstances(data.procedureInstances || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
    fetchData();
  }, []);

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
      {templates.map((template) => (
        <div key={template.templateId} className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{template.name}</h2>
          <p className="text-muted-foreground mb-4">{template.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {instances
              .filter(instance => instance.templateId === template.templateId)
              .map((instance: any) => {
                const currentState = calculateCurrentState(template.stateMachine.fsl, instance.history.messages);
                const lastActivity = instance.history.messages[instance.history.messages.length - 1]?.timestamp;
                const firstEventDate = instance.history.events[0]?.timestamp;

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
                            <span>{instance.history.messages.length} msgs</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <span>{instance.history.events.length} events</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <GitBranch className="h-4 w-4 text-muted-foreground" />
                            <span>{template.templateId}</span>
                          </div>
                        </div>
                      <CardContent>
                        <CardFooter>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {instance.history.events[0]?.timestamp 
                                ? format(new Date(instance.history.events[0].timestamp), "MMM d")
                                : "Not started"}
                            </span>
                          </div>
                        </CardFooter>
                        </CardContent>
                        <CardFooter>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {instance.history.events[0]?.timestamp 
                                ? format(new Date(instance.history.events[0].timestamp), "MMM d")
                                : "Not started"}
                            </span>
                          </div>
                        </CardFooter>
                      </CardContent>
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
function getStateBadgeVariant(state: string): "default" | "secondary" | "destructive" | "outline" | "success" {
  // Initial state
  if (state === 'idle') {
    return 'secondary';
  }
  
  // Failed/terminated states
  if (['terminated', 'failure'].includes(state)) {
    return 'destructive';
  }
  
  // Completed/successful states
  if (['contract_signed', 'active_employee'].includes(state)) {
    return 'default';
  }
  
  // Any other non-initial state should be green
  if (state !== 'idle') {
    return 'success';
  }
  
  return 'outline';
}

function formatDistanceToNow(arg0: Date) {
  
}

