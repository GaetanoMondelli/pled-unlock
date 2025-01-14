"use client"

import { useState } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Link from "next/link"

const mockRules = [
  { id: "1", condition: "Application Status: Received", matchingEvents: ["1"], message: "Application_Received" },
  { id: "2", condition: "Document Status: Verified", matchingEvents: ["2"], message: "Documents_Approved" },
  { id: "3", condition: "Interview Status: Scheduled", matchingEvents: ["3"], message: "Interview_Scheduled" },
]

export default function MessageRules({ procedureId }: { procedureId: string }) {
  const [rules, setRules] = useState(mockRules)

  const onDragEnd = (result: any) => {
    if (!result.destination) return

    const newRules = Array.from(rules)
    const [reorderedItem] = newRules.splice(result.source.index, 1)
    newRules.splice(result.destination.index, 0, reorderedItem)

    setRules(newRules)
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Message Rules</h3>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="rules">
          {(provided) => (
            <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {rules.map((rule, index) => (
                <Draggable key={rule.id} draggableId={rule.id} index={index}>
                  {(provided) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="bg-card p-4 rounded-lg shadow"
                    >
                      <div className="flex justify-between items-center">
                        <span>{rule.condition}</span>
                        <span className="text-sm text-muted-foreground">Matching events: {rule.matchingEvents.length}</span>
                      </div>
                      <p className="mt-2">Message: {rule.message}</p>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="link" size="sm">View Details</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Rule Details</DialogTitle>
                            <DialogDescription>
                              Condition: {rule.condition}
                              <br />
                              Message: {rule.message}
                              <br />
                              Matching Events:
                              <ul>
                                {rule.matchingEvents.map((eventId) => (
                                  <li key={eventId}>
                                    <Link href={`#event-${eventId}`} className="text-blue-500 hover:underline">
                                      Event {eventId}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
      <h3 className="text-lg font-semibold">Resulting Messages</h3>
      <ul className="space-y-2">
        {rules.map((rule) => (
          <li key={rule.id} className="bg-card p-4 rounded-lg shadow">
            <p>{rule.message}</p>
            <span className="text-sm text-muted-foreground">Based on: {rule.condition}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

