"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import EventList from "./event-list"
import MessageRules from "./message-rules"
import ProcedureState from "./procedure-state"
import ActionList from "./action-list"

const mockProcedure = {
  id: 1,
  name: "Customer Onboarding",
  description: "Process for onboarding new customers"
}

export default function ProcedureContent() {
  const [selectedProcedure] = useState(mockProcedure)

  return (
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
            <ProcedureState procedureId={selectedProcedure.id} />
          </TabsContent>
          <TabsContent value="actions">
            <ActionList procedureId={selectedProcedure.id} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

