"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { D3Graph } from './d3-graph'
import { calculateCurrentState, createStateMachine } from "@/lib/fsm"
import { NodeDetailsDialog } from './node-details-dialog'

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
  params: { id: string };
  template?: {
    documents?: {
      contracts?: Array<{
        id: string;
        name: string;
        type: string;
        content: string;
        linkedStates?: string[];
      }>;
    };
    states?: {
      [key: string]: {
        description?: string;
        actions?: string[];
      };
    };
  };
}

export const ProcedureState: React.FC<ProcedureStateProps> = ({ 
  definitionProp, 
  messagesProp,
  params,
  template = { documents: { contracts: [] }, states: {} }
}) => {
  const [definition, setDefinition] = useState<string>(
    definitionProp?.replace(/;\s*/g, ';\n') || `
      idle 'start' -> processing;
      success 'reset' -> failure;
      processing 'complete' -> success;
      processing 'fail' -> failure;
      failure 'retry' -> idle;
    `
  )

  const [stateMachine, setStateMachine] = useState(() => createStateMachine(definition))
  const [currentState, setCurrentState] = useState(() => 
    calculateCurrentState(definition, messagesProp)
  );
  const [messages, setMessages] = useState<Message[]>(messagesProp || [])
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Extract nodes and transitions from the state machine
  const nodes = useMemo(() => {
    // Get all unique states from the FSM definition
    const stateSet = new Set<string>();
    
    // Add states from the definition
    definition.split(';').forEach(line => {
      line = line.trim();
      if (line) {
        // Extract source state
        const sourceState = line.split(/\s+/)[0];
        // Extract target state (after '-> ')
        const targetState = line.split('->')[1]?.trim();
        
        if (sourceState) stateSet.add(sourceState);
        if (targetState) stateSet.add(targetState);
      }
    });

    // Find final states (states with no outgoing transitions)
    const finalStates = new Set(Array.from(stateSet));
    definition.split(';').forEach(line => {
      line = line.trim();
      if (line) {
        const sourceState = line.split(/\s+/)[0];
        finalStates.delete(sourceState);
      }
    });

    console.log('States found:', Array.from(stateSet));
    
    return Array.from(stateSet).map(state => ({
      id: state,
      isActive: state === currentState,
      isInitial: state === 'idle',
      isFinal: finalStates.has(state),
      metadata: {
        ...template?.states?.[state],
        // Add actions if they exist in the template
        actions: template?.states?.[state]?.actions || [],
        // We don't need to add documents here as they're inferred from the documents section
      }
    }));
  }, [definition, currentState, template]);

  const links = useMemo(() => {
    const transitionLinks: { source: string; target: string; label: string }[] = [];
    
    // Parse each line of the definition
    definition.split(';').forEach(line => {
      line = line.trim();
      if (!line) return;

      // Match pattern: sourceState 'eventName' -> targetState
      const match = line.match(/(\w+)\s+'([^']+)'\s*->\s*(\w+)/);
      if (match) {
        const [, source, event, target] = match;
        transitionLinks.push({
          source,
          target,
          label: event
        });
      }
    });

    console.log('Transitions found:', transitionLinks);
    return transitionLinks;
  }, [definition]);

  // Debug logs
  console.log('Current State:', currentState);
  console.log('Graph Nodes:', nodes);
  console.log('Graph Links:', links);

  const handleDefinitionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDefinition = e.target.value;
    setDefinition(newDefinition);
    try {
      const newStateMachine = createStateMachine(newDefinition);
      setStateMachine(newStateMachine);
      setCurrentState(calculateCurrentState(newDefinition, messagesProp));
    } catch (error) {
      console.error("Invalid state machine definition", error);
    }
  };

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

  const handleNodeClick = (node: any) => {
    console.log('Clicked node:', node);
    setSelectedNode(node);
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="w-full h-[600px] bg-white rounded-lg shadow-lg p-4">
        <div className="flex flex-col h-full">
          <div className="flex-grow">
            <D3Graph
              nodes={nodes}
              links={links}
              width={800}
              height={500}
              direction="LR"
              onNodeClick={handleNodeClick}
              documents={template?.documents}
            />
          </div>
          <div className="mt-4">
            <Textarea
              value={definition}
              onChange={handleDefinitionChange}
              className="w-full h-24"
              placeholder="Enter state machine definition..."
            />
          </div>
        </div>
      </div>
      <NodeDetailsDialog
        node={selectedNode}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        documents={template?.documents}
        procedureId={params.id}
      />
    </>
  )
}

export default ProcedureState
