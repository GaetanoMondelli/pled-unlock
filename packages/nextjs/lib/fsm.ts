import { sm } from 'jssm'

interface Message {
  id: string;
  type: string;
  timestamp: string;
  title: string;
  content: string;
  fromEvent?: string;
}

export const calculateCurrentState = (fsl: string, messages: Message[]) => {
  try {
    const machine = sm`${fsl.trim()}`
    let currentState = machine.state();
    
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
  } catch (error) {
    console.error("Error initializing state machine:", error);
    return "error";
  }
};

export const createStateMachine = (fsl: string) => {
  return sm`${fsl.trim()}`;
}; 