import { createStateMachine } from "@/lib/fsm";
import { generateMessages } from "./messageGeneration";

interface StateTransition {
  id: string;
  timestamp: string;
  message: string;
  fromState: string;
  toState: string;
}

export function handleEventAndGenerateMessages(
  event: any,
  rules: any[],
  variables: any,
  currentState: string,
  fsmDefinition: string
) {
  console.log('handleEventAndGenerateMessages input:', {
    event,
    rules,
    variables,
    currentState,
    fsmDefinition
  });

  // 1. Generate messages from the event
  const { messages, outputs } = generateMessages([event], rules, variables);
  console.log('Generated messages:', { messages, outputs });

  // 2. Check if any messages trigger state transitions
  const stateMachine = createStateMachine(fsmDefinition);
  const transitions: StateTransition[] = [];
  
  messages.forEach(message => {
    try {
      console.log('Processing message for transition:', {
        message,
        currentState,
        // availableActions: 
      });

      stateMachine.go(currentState);
      const prevState = currentState;
      const actionResult = stateMachine.action(message.type);
      
      console.log('Action result:', {
        messageType: message.type,
        actionResult,
        prevState,
        newState: stateMachine.state()
      });
      
      if (actionResult) {
        const newState = stateMachine.state();
        transitions.push({
          id: message.id,
          timestamp: message.timestamp,
          message: message.type,
          fromState: prevState,
          toState: newState
        });
        currentState = newState;
      }
    } catch (error) {
      console.error('Error processing state transition:', error);
    }
  });

  const result = {
    messages,
    outputs,
    transitions,
    finalState: currentState
  };

  console.log('handleEventAndGenerateMessages result:', result);
  return result;
} 