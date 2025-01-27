"use client";

import { useState } from "react";
import ActionList from "@/components/ui/action-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import EventList from "@/components/ui/event-list";
import MessageRules from "@/components/ui/message-rules";
import ProcedureState from "@/components/ui/procedure-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const mockProcedures = [
  { id: 1, name: "Customer Onboarding", description: "Process for onboarding new customers" },
  { id: 2, name: "Order Fulfillment", description: "Steps for fulfilling customer orders" },
  { id: 3, name: "Employee Hiring", description: "Procedure for hiring new employees" },
];

export default function ProcedureList() {
  const [selectedProcedure, setSelectedProcedure] = useState<any | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="space-y-4">
        {mockProcedures.map(procedure => (
          <Card
            key={procedure.id}
            className="cursor-pointer hover:bg-accent"
            onClick={() => setSelectedProcedure(procedure)}
          >
            <CardHeader>
              <CardTitle>{procedure.name}</CardTitle>
              <CardDescription>{procedure.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      {selectedProcedure && (
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{selectedProcedure.name}</CardTitle>
              <CardDescription>{selectedProcedure.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="events">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="events">Events</TabsTrigger>
                  <TabsTrigger value="messages">Messages</TabsTrigger>
                  <TabsTrigger value="state">State</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>
                <TabsContent value="events">
                  <EventList procedureId={selectedProcedure.id} />
                </TabsContent>
                <TabsContent value="messages">
                  <MessageRules procedureId={selectedProcedure.id} />
                </TabsContent>
                <TabsContent value="state">
                  <ProcedureState
                    procedureId={selectedProcedure.id}
                    definitionProp={selectedProcedure.stateMachine.fsl}
                    params={{
                      id: "",
                    }}
                  />
                </TabsContent>
                <TabsContent value="actions">
                  <ActionList procedureId={selectedProcedure.id} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
