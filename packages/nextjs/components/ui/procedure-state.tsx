"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { D3Graph } from './d3-graph'
import { calculateCurrentState, createStateMachine } from "@/lib/fsm"
import { NodeDetailsDialog } from './node-details-dialog'
import { FSMDefinitionModal } from './fsm-definition-modal'
import { StateHistory } from './state-history'
import { fetchFromDb } from "~~/utils/api"
import { handleEventAndGenerateMessages } from "@/utils/stateAndMessageHandler"
import { Card } from "@/components/ui/card"

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
  procedureId: string;
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

interface StateTransition {
  id: string;
  timestamp: string;
  message: string;
  fromState: string;
  toState: string;
}

export const ProcedureState: React.FC<ProcedureStateProps> = ({ 
  definitionProp, 
  procedureId,
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
  const [events, setEvents] = useState<Event[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [currentState, setCurrentState] = useState(() => 
    calculateCurrentState(definition, messages)
  )
  const [selectedNode, setSelectedNode] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [focusedState, setFocusedState] = useState<string | null>(null)
  const graphRef = useRef<any>(null)
  const [stateHistory, setStateHistory] = useState<StateTransition[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [generatedMessages, setGeneratedMessages] = useState<Message[]>([])

  // Load events and process them
  useEffect(() => {
    const loadAndProcessEvents = async () => {
      try {
        // Get the data from the API
        const data = await fetchFromDb()
        const instance = data.procedureInstances.find((p: any) => p.instanceId === procedureId)
        const template = data.procedureTemplates?.find(
          (t: any) => t.templateId === instance?.templateId
        )

        if (!instance || !template) {
          console.error('Instance or template not found')
          return
        }

        // Set the events
        const events = instance.history?.events || []
        setEvents(events)

        console.log('Processing events:', {
          events,
          messageRules: template.messageRules,
          variables: instance.variables
        })

        // Process each event to generate messages and transitions
        let currentState = 'idle'
        const allMessages: Message[] = []
        const allTransitions: StateTransition[] = []

        for (const event of events) {
          const result = handleEventAndGenerateMessages(
            event,
            template.messageRules || [],
            instance.variables || {},
            currentState,
            definition
          )

          allMessages.push(...result.messages)
          allTransitions.push(...result.transitions)
          currentState = result.finalState
        }

        console.log('Generated results:', {
          messages: allMessages,
          transitions: allTransitions,
          finalState: currentState
        })

        setGeneratedMessages(allMessages)
        setStateHistory(allTransitions)
        setCurrentState(currentState)
        setMessages(allMessages) // For backward compatibility

      } catch (error) {
        console.error('Error loading and processing events:', error)
      }
    }

    loadAndProcessEvents()
  }, [procedureId, definition])

  // Extract nodes and transitions from the state machine
  const nodes = useMemo(() => {
    // Get all unique states from the FSM definition
    const stateSet = new Set<string>()
    
    definition.split(';').forEach(line => {
      line = line.trim()
      if (line) {
        // Extract source state
        const sourceState = line.split(/\s+/)[0]
        // Extract target state (after '-> ')
        const targetState = line.split('->')[1]?.trim()
        
        if (sourceState) stateSet.add(sourceState)
        if (targetState) stateSet.add(targetState)
      }
    })

    // Find final states (states with no outgoing transitions)
    const finalStates = new Set(Array.from(stateSet))
    definition.split(';').forEach(line => {
      line = line.trim()
      if (line) {
        const sourceState = line.split(/\s+/)[0]
        finalStates.delete(sourceState)
      }
    })

    console.log('States found:', Array.from(stateSet))
    
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
    }))
  }, [definition, currentState, template])

  const links = useMemo(() => {
    const transitionLinks: { source: string; target: string; label: string }[] = []
    
    // Parse each line of the definition
    definition.split(';').forEach(line => {
      line = line.trim()
      if (!line) return

      // Match pattern: sourceState 'eventName' -> targetState
      const match = line.match(/(\w+)\s+'([^']+)'\s*->\s*(\w+)/)
      if (match) {
        const [, source, event, target] = match
        transitionLinks.push({
          source,
          target,
          label: event
        })
      }
    })

    console.log('Transitions found:', transitionLinks)
    return transitionLinks
  }, [definition])

  // Debug logs
  console.log('Current State:', currentState)
  console.log('Graph Nodes:', nodes)
  console.log('Graph Links:', links)

  const handleDefinitionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDefinition = e.target.value
    setDefinition(newDefinition)
    try {
      const newStateMachine = createStateMachine(newDefinition)
      setStateMachine(newStateMachine)
      setCurrentState(calculateCurrentState(newDefinition, messages))
    } catch (error) {
      console.error("Invalid state machine definition", error)
    }
  }

  const handleSendMessage = (messageType: string) => {
    try {
      stateMachine.go(currentState)
      const previousState = currentState
      const actionResult = stateMachine.action(messageType)
      if (!actionResult) {
        console.warn(`Action "${messageType}" is invalid for current state ${currentState}`)
        return
      }

      const newState = stateMachine.state()
      const newMessage: Message = {
        id: `msg_${Date.now()}`,
        type: messageType,
        timestamp: new Date().toISOString(),
        title: `${messageType}`,
        content: `Transition: ${previousState} -> ${newState}`
      }

      setMessages(prev => [...prev, newMessage])
      setStateHistory(prev => [...prev, {
        id: newMessage.id,
        timestamp: newMessage.timestamp,
        message: messageType,
        fromState: previousState,
        toState: newState
      }])
      setCurrentState(newState)
    } catch (error) {
      console.error("Error during state transition:", error)
    }
  }

  const handleNodeClick = (node: any) => {
    console.log('Clicked node:', node)
    setSelectedNode(node)
    setIsDialogOpen(true)
    setFocusedState(node.id)
    if (graphRef.current?.focusOnState) {
      graphRef.current.focusOnState(node.id)
    }
  }

  const handleFocusState = (state: string) => {
    setFocusedState(prev => prev === state ? null : state)
    if (graphRef.current?.focusOnState && state !== focusedState) {
      graphRef.current.focusOnState(state)
    }
  }

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      setFocusedState(null)
    }
  }

  return (
    <>
      <div 
        className="flex flex-col gap-6" 
        onClick={handleContainerClick}
        ref={containerRef}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">State Machine Visualization</h3>
          <FSMDefinitionModal 
            definition={definition}
            onChange={(value: string) => handleDefinitionChange({ target: { value } } as React.ChangeEvent<HTMLTextAreaElement>)}
          />
        </div>

        <div className="w-full bg-white rounded-lg shadow-lg p-4">
          <D3Graph
            ref={graphRef}
            nodes={nodes.map(node => ({
              ...node,
              highlight: node.id === focusedState
            }))}
            links={links}
            width={800}
            height={500}
            direction="LR"
            onNodeClick={handleNodeClick}
            documents={template?.documents}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">State Transition History {procedureId}</h3>
          <StateHistory 
            transitions={stateHistory}
            onFocusState={handleFocusState}
            focusedState={focusedState}
          />
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
