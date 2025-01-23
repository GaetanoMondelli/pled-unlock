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
        const data = await fetchFromDb()
        const instance = data.procedureInstances.find((p: any) => p.instanceId === procedureId)
        const template = data.procedureTemplates?.find(
          (t: any) => t.templateId === instance?.templateId
        )

        if (!instance || !template) {
          console.error('Instance or template not found')
          return
        }

        const events = instance.history?.events || []
        setEvents(events)

        // Process each event to generate messages and transitions
        let currentState = 'idle'
        const allMessages: Message[] = []
        const allTransitions: StateTransition[] = []

        const machine = createStateMachine(definition)
        machine.go(currentState)

        for (const event of events) {
          const previousState = currentState
          const result = handleEventAndGenerateMessages(
            event,
            template.messageRules || [],
            instance.variables || {},
            currentState,
            definition
          )

          // Get the first message type to use for the state machine transition
          const messageType = result.messages[0]?.type
          if (messageType) {
            // Apply the transition using the message type instead of event type
            const actionResult = machine.action(messageType)
            if (actionResult) {
              currentState = machine.state()
            }
          }

          const processedMessages = result.messages.map(msg => ({
            ...msg,
            id: msg.id || `msg_${Date.now()}_${Math.random()}`,
            timestamp: msg.timestamp || new Date().toISOString(),
            title: msg.title || event.title || 'Event',
            type: msg.type,
            content: msg.content || `Transition from ${previousState} to ${currentState}`
          }))

          allMessages.push(...processedMessages)
          
          // Add transition to history with message type
          allTransitions.push({
            id: `transition_${Date.now()}_${Math.random()}`,
            timestamp: event.timestamp || new Date().toISOString(),
            message: messageType || 'unknown',
            type: messageType,
            title: event.title || '',
            fromState: previousState,
            toState: currentState
          })
        }

        console.log('Generated results:', {
          messages: allMessages,
          transitions: allTransitions,
          finalState: currentState
        })

        setGeneratedMessages(allMessages)
        setStateHistory(allTransitions)
        setCurrentState(currentState)
        setMessages(allMessages)

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
      const previousState = currentState
      const machine = createStateMachine(definition)
      machine.go(previousState)
      
      const actionResult = machine.action(messageType)
      if (!actionResult) {
        console.warn(`Action "${messageType}" is invalid for current state ${currentState}`)
        return
      }

      const newState = machine.state()
      const timestamp = new Date().toISOString()
      
      const newMessage: Message = {
        id: `msg_${Date.now()}`,
        type: messageType,
        timestamp,
        title: `State Change`,
        content: `Transition: ${previousState} -> ${newState}`
      }

      const newTransition: StateTransition = {
        id: newMessage.id,
        timestamp,
        message: messageType,
        type: messageType,
        title: 'State Change',
        fromState: previousState,
        toState: newState
      }

      setMessages(prev => [...prev, newMessage])
      setStateHistory(prev => [...prev, newTransition])
      setCurrentState(newState)
      
      console.log('New transition added:', newTransition)
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

        {/* Add Available Actions */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Available Actions</h3>
          <div className="flex gap-2 flex-wrap">
            {links
              .filter(link => link.source === currentState)
              .map(link => (
                <Button
                  key={link.label}
                  onClick={() => handleSendMessage(link.label)}
                  variant="outline"
                >
                  {link.label}
                </Button>
              ))}
          </div>
        </div>

        {/* Add Messages Display */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Messages</h3>
          <div className="space-y-2">
            {messages.map((message) => (
              <Card key={message.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{message.title}</h4>
                    <p className="text-sm text-gray-600">{message.content}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleString()}
                  </span>
                </div>
              </Card>
            ))}
          </div>
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
