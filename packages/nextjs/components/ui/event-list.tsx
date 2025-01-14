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
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle, Upload } from 'lucide-react'

const mockEvents = [
  { id: "1", title: "Application Received", timestamp: "2023-05-01 10:00:00" },
  { id: "2", title: "Document Verification", timestamp: "2023-05-02 11:30:00" },
  { id: "3", title: "Interview Scheduled", timestamp: "2023-05-03 14:15:00" },
]

export default function EventList({ procedureId }: { procedureId: string }) {
  const [events, setEvents] = useState(mockEvents)
  const [newEventTitle, setNewEventTitle] = useState("")

  const onDragEnd = (result: any) => {
    if (!result.destination) return

    const newEvents = Array.from(events)
    const [reorderedItem] = newEvents.splice(result.source.index, 1)
    newEvents.splice(result.destination.index, 0, reorderedItem)

    setEvents(newEvents)
  }

  const addNewEvent = () => {
    if (newEventTitle) {
      const newEvent = {
        id: String(events.length + 1),
        title: newEventTitle,
        timestamp: new Date().toISOString(),
      }
      setEvents([...events, newEvent])
      setNewEventTitle("")
    }
  }

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="events">
          {(provided) => (
            <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {events.map((event, index) => (
                <Draggable key={event.id} draggableId={event.id} index={index}>
                  {(provided) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="bg-card p-4 rounded-lg shadow"
                    >
                      <div className="flex justify-between items-center">
                        <span>{event.title}</span>
                        <span className="text-sm text-muted-foreground">{event.timestamp}</span>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="link" size="sm">View Details</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{event.title}</DialogTitle>
                            <DialogDescription>
                              Timestamp: {event.timestamp}
                              <br />
                              Additional details about the event would be displayed here.
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
      <Dialog>
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Event
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Event</DialogTitle>
            <DialogDescription>
              Enter the details for the new event or upload a file.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="event-title" className="text-right">
                Event Title
              </Label>
              <Input
                id="event-title"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addNewEvent}>Add Event</Button>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" /> Upload File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

