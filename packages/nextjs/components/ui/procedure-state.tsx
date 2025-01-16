"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import StateGraph from "@/components/ui/state-graph"
import { sm } from 'jssm'

interface Message {
  id: string;
  type: string;
  timestamp: string;
  title: string;
  content: string;
  fromEvent?: string;
}

interface ProcedureStateProps {
  definitionProp: string;
  messagesProp: Message[];
}

export const ProcedureState: React.FC<ProcedureStateProps> = ({ definitionProp, messagesProp}) => {
  const [definition, setDefinition] = useState<string>(
    definitionProp?.replace(/;\s*/g, ';\n') || `
      idle 'start' -> processing;
      success 'reset' -> failure;
      processing 'complete' -> success;
      processing 'fail' -> failure;
      failure 'retry' -> idle;
    `
  )

  const calculateCurrentState = (messages: Message[], machine: any) => {
    let currentState = machine.state(); // Start from initial state
    
    // Sort messages by timestamp and apply transitions
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const message of sortedMessages) {
      try {
        machine.go(currentState);
        const actionResult = machine.action(message.type);
        if (actionResult) {
          currentState = machine.state();
        }
      } catch (error) {
        console.error(`Error applying message ${message.type}:`, error);
      }
    }
    
    return currentState;
  };

  const [stateMachine, setStateMachine] = useState(() => sm`${(definition).trim()}`)
  const [currentState, setCurrentState] = useState(() => 
    calculateCurrentState(messagesProp, stateMachine)
  );
  const [messages, setMessages] = useState<Message[]>(messagesProp || [])

  const handleDefinitionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDefinition = e.target.value
    setDefinition(newDefinition)
    try {
      const newStateMachine = sm`${newDefinition.trim().replace(/\n/g, ' ')}`
      setStateMachine(newStateMachine)
      setCurrentState(calculateCurrentState(messages, newStateMachine))
    } catch (error) {
      console.error("Invalid state machine definition", error)
    }
  }

  const handleSendMessage = (messageType: string) => {
    try {
      stateMachine.go(currentState)
      const actionResult = stateMachine.action(messageType);
      if (!actionResult) {
        console.warn(`Action "${messageType}" is invalid for current state ${currentState}`);
        return;
      }

      const newState = stateMachine.state();
      const newMessage: Message = {
        id: `msg_${Date.now()}`,
        type: messageType,
        timestamp: new Date().toISOString(),
        title: `State changed to ${newState}`,
        content: `Transition: ${currentState} -> ${newState}`
      };

      setMessages(prev => [...prev, newMessage]);
      setCurrentState(newState);
    } catch (error) {
      console.error("Error during state transition:", error);
    }
  };
  


  return (
    <>
      <h4 className="text-md font-semibold mb-2">Executed Messages for Procedure</h4>
      <ul className="space-y-2">
        {/* <Button onClick={() => handleSendMessage('start')}>Send 'start' Message</Button>
        <Button onClick={() => handleSendMessage('complete')}>Send 'complete' Message</Button>
        <Button onClick={() => handleSendMessage('fail')}>Send 'fail' Message</Button>
        <Button onClick={() => handleSendMessage('reset')}>Send 'reset' Message</Button>
        <Button onClick={() => handleSendMessage('retry')}>Send 'retry' Message</Button> */}
        <p>Current State: {currentState}</p>
        <p>Messages: {messages.map(m => m.type).join(', ')}</p>

      </ul>
      <div className="flex gap-4 mt-4"> 
        { <StateGraph definition={definition} currentState={currentState} />}
        <Textarea value={definition} onChange={handleDefinitionChange} className="mb-4 w-1/2" />
      </div>
    </>
  )
}

export default ProcedureState
