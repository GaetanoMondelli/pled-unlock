"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import StateGraph from "@/components/ui/state-graph"
import { sm } from 'jssm'

interface ProcedureStateProps {
  state: {
    messages: { id: string; content: string }[]; // Define the structure of messages
  };
  procedureId: string; // Add procedureId to the props
}

export const ProcedureState: React.FC<ProcedureStateProps> = ({ state, procedureId }) => {
  const [definition, setDefinition] = useState<string>(`
    idle 'start' -> processing;
    success 'reset' -> failure;
    processing 'complete' -> success;
    processing 'fail' -> failure;
    failure 'retry' -> idle;
  `)

  const [stateMachine, setStateMachine] = useState(() => sm`${(definition).trim()}`)
  const [currentState, setCurrentState] = useState(stateMachine.state());
  const [messages, setMessages] = useState([] as string[])

  const handleDefinitionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDefinition = e.target.value
    setDefinition(newDefinition)
    try {
      const newStateMachine = sm`${newDefinition.trim()}`
      setStateMachine(newStateMachine)
    } catch (error) {
      console.error("Invalid state machine definition", error)
    }
  }

  const handleSendMessage = (message: string) => {
    try {
      stateMachine.go(currentState)
      const actionResult = stateMachine.action(message);
      if (!actionResult) {
        console.warn(`Action "${message}" is invalid for the current state ${currentState}`);
        return;
      }
  
      // Ottieni il nuovo stato
      const newState = stateMachine.state();
  
      // Applica lo stile al nuovo stato
      const newStyle = `state ${newState} : { background-color: green;  corners: rounded; };`;
      console.log(`Updated style: ${newStyle}`); // Debug: vedi lo stile generato
  
      // Aggiorna i messaggi e lo stato corrente
      setMessages((prevMessages) => [...prevMessages, message]);
      setCurrentState(newState);
  
      // setStateMachine(sm`${(definition).trim()} \n ${newStyle}`);
    } catch (error) {
      console.error("Error during state transition:", error);
    }
  };
  


  return (
    <>
      <h4 className="text-md font-semibold mb-2">Executed Messages for Procedure</h4>
      <p>Messages: {messages.join(', ')}</p>
      <ul className="space-y-2">
        <Button onClick={() => handleSendMessage('start')}>Send 'start' Message</Button>
        <Button onClick={() => handleSendMessage('complete')}>Send 'complete' Message</Button>
        <Button onClick={() => handleSendMessage('fail')}>Send 'fail' Message</Button>
        <Button onClick={() => handleSendMessage('reset')}>Send 'reset' Message</Button>
        <Button onClick={() => handleSendMessage('retry')}>Send 'retry' Message</Button>
        <p>Current State: {currentState}</p>
        {state.messages.map((message) => (
          <li key={message.id} className="bg-card p-2 rounded-lg">
            <span>{message.content}</span>
          </li>
        ))}
      </ul>
      <div className="flex gap-4 mt-4"> 
        { <StateGraph definition={definition} currentState={currentState} />}
        <Textarea value={definition} onChange={handleDefinitionChange} className="mb-4 w-1/2" />
      </div>
    </>
  )
}

export default ProcedureState

