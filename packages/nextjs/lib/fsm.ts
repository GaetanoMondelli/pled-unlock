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

interface ActionLog {
  actionId: string;
  state: string;
  timestamp: string;
  eventId: string;
  transitionId: string;
  previousState: string;
  trigger: string;
}

interface ActionExecution {
  actionId: string;
  state: string;
  trigger: string;  // The event that caused this state
  timestamp: string;
  eventId: string;
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

export const calculateCurrentState = async (
  definition: string, 
  messages: any[], 
  instance: any,
  template: any
) => {
  const machine = createStateMachine(definition);
  let currentState = 'idle';
  machine.go(currentState);

  if (!instance) {
    console.log('No instance provided to calculateCurrentState');
    return currentState;
  }

  // Initialize action tracking if it doesn't exist
  if (!instance.history) {
    instance.history = {};
  }
  if (!instance.history.executedActions) {
    instance.history.executedActions = [];
  }

  let processedState = 'idle';
  
  for (const message of messages) {
    if (message.type) {
      const previousState = processedState;
      const actionResult = machine.action(message.type);
      
      if (actionResult) {
        processedState = machine.state();
        
        // Get actions that should be executed in this state
        const stateActions = template?.actions?.[processedState] || [];
        
        // Find which actions haven't been executed for this state transition
        const pendingActions = stateActions.filter(action => {
          const hasBeenExecuted = instance.history.executedActions.some(
            (executed: ActionExecution) => 
              executed.actionId === action.id && 
              executed.state === processedState &&
              executed.trigger === message.type
          );
          return !hasBeenExecuted && action.enabled;
        });

        console.log('State transition:', {
          from: previousState,
          to: processedState,
          trigger: message.type,
          pendingActions: pendingActions.length
        });

        // Execute pending actions
        for (const action of pendingActions) {
          try {
            const event = {
              id: `evt_${Date.now()}`,
              ...action.template.data,
              timestamp: new Date().toISOString(),
              source: action.id,
              transition: {
                from: previousState,
                to: processedState,
                trigger: message.type
              }
            };

            const response = await fetch('/api/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event,
                action: 'add',
                procedureId: instance.instanceId
              })
            });

            if (response.ok) {
              // Record the action execution
              instance.history.executedActions.push({
                actionId: action.id,
                state: processedState,
                trigger: message.type,
                timestamp: new Date().toISOString(),
                eventId: event.id
              });

              // Update instance in database
              await fetch('/api/procedures/' + instance.instanceId, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  history: instance.history
                })
              });
            }
          } catch (error) {
            console.error('Error executing action:', error);
          }
        }
      }
    }
  }

  return processedState;
}; 