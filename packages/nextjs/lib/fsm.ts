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

export function createStateMachine(definition: string) {
  const warningStates = new Set<string>();
  const states = new Set<string>();
  
  definition.split(';').forEach(line => {
    line = line.trim();
    if (!line) return;

    const match = line.match(/(\w+)\s+'([^']+)'\s*->\s*(\w+)/);
    if (match) {
      const [, source, , target] = match;
      states.add(source);
      states.add(target);
      
      // Identify warning states
      if (source.startsWith('warning_')) warningStates.add(source);
      if (target.startsWith('warning_')) warningStates.add(target);
    }
  });

  return {
    states: Array.from(states).map(state => ({
      id: state,
      isInitial: state === 'idle',
      isWarning: warningStates.has(state)
    })),
    // ... rest of the implementation
  };
} 