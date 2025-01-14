"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

const mockAutomaticActions = [
  { id: 1, name: "Send Welcome Email", trigger: "Application Received" },
  { id: 2, name: "Schedule Document Review", trigger: "Documents Submitted" },
  { id: 3, name: "Send Interview Invitation", trigger: "Documents Approved" },
]

const mockManualActions = [
  { id: 1, name: "Approve Documents", available: true },
  { id: 2, name: "Reject Application", available: true },
  { id: 3, name: "Schedule Interview", available: false },
  { id: 4, name: "Extend Offer", available: false },
]

const mockActionLog = [
  { id: 1, action: "Application Received", timestamp: "2023-05-01 10:00:00" },
  { id: 2, action: "Send Welcome Email", timestamp: "2023-05-01 10:01:00" },
  { id: 3, action: "Documents Submitted", timestamp: "2023-05-02 14:30:00" },
  { id: 4, action: "Schedule Document Review", timestamp: "2023-05-02 14:31:00" },
]

export default function ActionList({ procedureId }: { procedureId: string }) {
  const [automaticActions] = useState(mockAutomaticActions)
  const [manualActions, setManualActions] = useState(mockManualActions)
  const [actionLog, setActionLog] = useState(mockActionLog)

  const executeAction = (actionId: number) => {
    const action = manualActions.find(a => a.id === actionId)
    if (action) {
      const newLog = {
        id: actionLog.length + 1,
        action: action.name,
        timestamp: new Date().toISOString()
      }
      setActionLog([newLog, ...actionLog])
      
      // Update available actions (this is a simplified example)
      setManualActions(manualActions.map(a => 
        a.id === actionId ? { ...a, available: false } : a
      ))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Automatic Actions</h3>
        <ul className="space-y-2">
          {automaticActions.map((action) => (
            <li key={action.id} className="bg-card p-2 rounded-lg">
              <span>{action.name}</span>
              <span className="text-sm text-muted-foreground ml-2">Trigger: {action.trigger}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Manual Actions</h3>
        <div className="space-y-2">
          {manualActions.map((action) => (
            <Button
              key={action.id}
              onClick={() => executeAction(action.id)}
              disabled={!action.available}
              className="w-full"
            >
              {action.name}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Action Log</h3>
        <ul className="space-y-2">
          {actionLog.map((log) => (
            <li key={log.id} className="bg-card p-2 rounded-lg">
              <span>{log.action}</span>
              <span className="text-sm text-muted-foreground ml-2">{log.timestamp}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

