"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  ChevronRight, 
  VariableIcon,
  CalendarDays, 
  MessageSquare, 
  GitBranch, 
  PlayCircle,
  Folder,
  Beaker
} from "lucide-react";
import pledData from "@/public/pled.json";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import EventsList from "@/components/ui/event-list";
import MessageRules from "@/components/ui/message-rules";
import ProcedureState from "@/components/ui/procedure-state";
import ActionList from "@/components/ui/action-list";
import EnvelopeView from "~~/components/ui/envelope-view";
import { useSearchParams, useRouter } from 'next/navigation';
import { PlaygroundView } from "@/components/ui/playground-view";
import { VariablesSection } from "@/components/variables/VariablesSection";

type Variables = {
  candidate: { email: string; name: string };
  company: { email: string; department: string };
};

export default function ProcedureLayout({ 
  children, 
  params 
}: { 
  children: React.ReactNode;
  params: { id: string };
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams?.get('tab') || 'events';

  const handleTabChange = (tab: string) => {
    router.push(`/procedures/${params.id}?tab=${tab}`);
  };

  const instance : any = pledData.procedureInstances.find(p => p.instanceId === params.id);
  if (!instance) return null;

  const template = pledData.procedureTemplates.find(t => t.templateId === instance.templateId);
  if (!template) return null;

  const navItems = [
    { id: 'variables', label: 'Variables', icon: <VariableIcon className="h-4 w-4" /> },
    { id: 'events', label: 'Events', icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'state', label: 'State Machine', icon: <GitBranch className="h-4 w-4" /> },
    { id: 'actions', label: 'Actions', icon: <PlayCircle className="h-4 w-4" /> },
    { id: 'envelope', label: 'Envelope', icon: <Folder className="h-4 w-4" /> },
    { id: 'playground', label: 'Playground', icon: <Beaker className="h-4 w-4" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'variables':
        return (
          <VariablesSection 
            procedureId={params.id}
            template={template}
            instance={instance}
          />
        );
      case 'events':
        return (
          <Card className="p-4">
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <EventsList procedureId={params.id} />
            </ScrollArea>
          </Card>
        );
      case 'messages':
        return (
          <Card className="p-4">
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <MessageRules procedureId={params.id} />
            </ScrollArea>
          </Card>
        );
      case 'state':
        return (
          <Card className="p-4">
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <ProcedureState 
                definitionProp={template.stateMachine.fsl} 
                messagesProp={instance.messages}
                template={template}
                params={params}
              />
            </ScrollArea>
          </Card>
        );
      case 'actions':
        return (
          <Card className="p-4">
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <ActionList procedureId={params.id} />
            </ScrollArea>
          </Card>
        );
      case 'envelope':
        return (
          <Card className="p-4">
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <EnvelopeView procedureId={params.id} template={template} />
            </ScrollArea>
          </Card>
        );
      case 'playground':
        return (
          <Card className="p-4">
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <PlaygroundView />
            </ScrollArea>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 p-4 text-sm border-b">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <Home className="h-4 w-4" />
          </Button>
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span>{template.name} - {instance.variables?.candidate?.name}</span>
      </div>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-64 border-r p-4">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => handleTabChange(item.id)}
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-2xl font-bold mb-4">{navItems.find(item => item.id === activeTab)?.label}</h2>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}