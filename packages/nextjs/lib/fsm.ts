import { sm } from 'jssm'

interface Message {
  id: string;
  type: string;
  timestamp: string;
  title: string;
  content: string;
  fromEvent?: string;
}

interface StateMachine {
  states: Array<{
    id: string;
    isInitial: boolean;
    isWarning: boolean;
  }>;
  currentState: string;
  transitions: Map<string, Map<string, string>>;
  go: (state: string) => void;
  action: (event: string) => boolean;
  state: () => string;
}

export function createStateMachine(definition: string): StateMachine {
  const transitions = new Map<string, Map<string, string>>();
  const states = new Set<string>();

  // Parse the definition
  definition.split(';').forEach(line => {
    line = line.trim();
    if (!line) return;

    const match = line.match(/(\w+)\s+'([^']+)'\s*->\s*(\w+)/);
    if (match) {
      const [, source, event, target] = match;
      
      // Add states to set
      states.add(source);
      states.add(target);

      // Add transition
      if (!transitions.has(source)) {
        transitions.set(source, new Map());
      }
      transitions.get(source)!.set(event, target);
    }
  });

  let currentState = Array.from(states).find(state => state === 'idle') || Array.from(states)[0];

  return {
    states: Array.from(states).map(id => ({
      id,
      isInitial: id === 'idle',
      isWarning: id === 'failure'
    })),
    currentState,
    transitions,
    go(state: string) {
      if (states.has(state)) {
        this.currentState = state;
      }
    },
    action(event: string): boolean {
      const stateTransitions = this.transitions.get(this.currentState);
      if (!stateTransitions) return false;

      const nextState = stateTransitions.get(event);
      if (!nextState) return false;

      this.currentState = nextState;
      return true;
    },
    state() {
      return this.currentState;
    }
  };
}

export function calculateCurrentState(definition: string, messages: Array<any>): string {
  const machine = createStateMachine(definition);
  
  messages.forEach(msg => {
    machine.go(machine.state());
    machine.action(msg.type);
  });

  return machine.state();
} 