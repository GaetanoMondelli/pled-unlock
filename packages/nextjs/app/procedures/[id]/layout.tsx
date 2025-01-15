"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, ChevronRight } from "lucide-react";
import pledData from "@/public/pled.json";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import EventsList from "@/components/ui/event-list";
import MessageRules from "@/components/ui/message-rules";
import ProcedureState from "@/components/ui/procedure-state";
import ActionList from "@/components/ui/action-list";

export default function ProcedureLayout({ 
  children, 
  params 
}: { 
  children: React.ReactNode;
  params: { id: string };
}) {
  const [activeTab, setActiveTab] = useState('events');
  const procedure = pledData.procedures.find(p => p.id === params.id);
  if (!procedure) return null;

  const navItems = [
    { id: 'events', label: 'Events' },
    { id: 'messages', label: 'Messages' },
    // { id: 'rules', label: 'Rules' },
    { id: 'state', label: 'State Machine' },
    { id: 'actions', label: 'Actions' },
  ];

  const renderContent = () => {
    switch (activeTab) {
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
              <ProcedureState procedureId={params.id} state={{
                messages: []
              }} />
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
        <span>{procedure.name}</span>
      </div>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-64 border-r p-4">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <h2 className="text-2xl font-bold mb-4">{navItems.find(item => item.id === activeTab)?.label}</h2>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}