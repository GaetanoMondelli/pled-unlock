"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useMachine } from "@xstate/react"
import { createMachine } from "xstate"
import StateGraph from "@/components/ui/state-graph"

const procedureMachine = createMachine({
  id: 'procedure',
  initial: 'B',
  states: {
    A: { on: { Application_Received: 'B' } },
    B: { 
      on: { 
        Documents_Approved: 'C', 
        Documents_Rejected: 'D' 
      } 
    },
    C: { on: { Interview_Scheduled: 'E' } },
    D: {},
    E: { 
      on: { 
        Interview_Passed: 'F', 
        Interview_Failed: 'D' 
      } 
    },
    F: { on: { Offer_Accepted: 'G' } },
    G: {}
  }
});

interface ProcedureStateProps {
  state: {
    messages: { id: string; content: string }[]; // Define the structure of messages
  };
  procedureId: string; // Add procedureId to the props
}

export const ProcedureState: React.FC<ProcedureStateProps> = ({ state, procedureId }) => {
  const [current] = useMachine(procedureMachine);

  return (
    <>
      <h4 className="text-md font-semibold mb-2">Executed Messages for Procedure {procedureId}</h4>
      <ul className="space-y-2">
        {state.messages.map((message) => (
          <li key={message.id} className="bg-card p-2 rounded-lg">
            <span>{message.content}</span>
          </li>
        ))}
      </ul>
      <StateGraph stateMachine={procedureMachine}></StateGraph>
    </>
  );
};

export default ProcedureState;

