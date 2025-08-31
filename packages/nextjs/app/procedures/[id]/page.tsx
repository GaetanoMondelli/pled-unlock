"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, User, Building, Settings, Activity, MessageSquare, Zap, Play } from "lucide-react";
import ProcedureState from "@/components/ui/procedure-state";
import EventList from "@/components/ui/event-list";
import MessageRules from "@/components/ui/message-rules";
import ActionList from "@/components/ui/action-list";
import { VariablesSection } from "~~/components/variables/VariablesSection";
import { fetchFromDb } from "~~/utils/api";

interface Template {
  templateId: string;
  name: string;
  description: string;
  variables: Record<string, Record<string, any>>;
  messageRules: any[];
  stateMachine?: {
    fsl: string;
    initial: string;
    final: string[];
  };
  actions?: Record<string, any[]>;
  documents?: {
    contracts?: Array<{
      id: string;
      name: string;
      type: string;
      content: string;
      linkedStates?: string[];
    }>;
  };
  states?: {
    [key: string]: {
      description?: string;
      actions?: string[];
    };
  };
}

interface Instance {
  instanceId: string;
  templateId: string;
  name: string;
  variables: Record<string, Record<string, any>>;
  events: any[];
  messages: any[];
  currentState?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  history?: {
    events?: any[];
    messages?: any[];
    executedActions?: any[];
  };
}

export default function ProcedurePage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<{ template: Template; instance: Instance } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams?.get('tab') || 'state');

  useEffect(() => {
    async function loadData() {
      try {
        const fullData = await fetchFromDb();
        const instance = fullData.procedureInstances?.find((p: any) => p.instanceId === params.id);
        const template = fullData.procedureTemplates?.find((t: any) => t.templateId === instance?.templateId);

        if (!instance || !template) {
          throw new Error("Procedure not found");
        }

        setData({ template, instance });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load procedure data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id]);

  // Update tab from URL params
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Link href="/procedures">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Procedures
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Procedure</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <Link href="/procedures">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Procedures
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Procedure Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">The procedure with ID "{params.id}" could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { template, instance } = data;

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/procedures">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Procedures
          </Button>
        </Link>

        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{instance.name || template.name}</h1>
              <Badge variant={instance.status === 'active' ? 'default' : 'secondary'}>
                {instance.status || 'unknown'}
              </Badge>
            </div>
            <p className="text-gray-600 text-lg mb-3">{template.description}</p>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>Instance: {instance.instanceId}</span>
              </div>
              <div className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                <span>Template: {template.templateId}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Created: {new Date(instance.createdAt || '').toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="state" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            State Machine
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Events
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Actions
          </TabsTrigger>
          <TabsTrigger value="variables" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Variables
          </TabsTrigger>
        </TabsList>

        <TabsContent value="state">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                State Machine Visualization
              </CardTitle>
              <CardDescription>
                Interactive state machine showing current state and available transitions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {template.stateMachine?.fsl ? (
                <ProcedureState
                  definitionProp={template.stateMachine.fsl}
                  procedureId={params.id}
                  params={params}
                  template={template}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h4 className="font-medium mb-2">No State Machine Defined</h4>
                  <p className="text-sm">This template doesn't have a state machine definition.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Event History
              </CardTitle>
              <CardDescription>All events that have occurred in this procedure instance</CardDescription>
            </CardHeader>
            <CardContent>
              <EventList procedureId={params.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Message Rules & Processing
              </CardTitle>
              <CardDescription>Rules that process events and generate messages</CardDescription>
            </CardHeader>
            <CardContent>
              <MessageRules procedureId={params.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Action Execution
              </CardTitle>
              <CardDescription>Actions executed and pending for this procedure</CardDescription>
            </CardHeader>
            <CardContent>
              <ActionList procedureId={params.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variables">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Procedure Variables
              </CardTitle>
              <CardDescription>Variables and their current values for this procedure</CardDescription>
            </CardHeader>
            <CardContent>
              <VariablesSection procedureId={params.id} template={template} instance={instance} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
