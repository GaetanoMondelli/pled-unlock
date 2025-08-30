# Composable State Machine Architecture

## Core Principle: State-Based Message Emission

The fundamental insight is that **individual states within state machines emit messages** that can be consumed by other state machines. This creates a composable architecture where complex workflows are built by connecting simpler state machine components.

## Architecture Overview

### 1. State-Centric Message Flow

Instead of just component-to-component communication, we focus on **state-to-component** message emission:

```typescript
// Each state can emit messages when entered, exited, or during actions
interface StateMessageEmitter {
  stateId: string;
  onEnter?: MessageEmission[];
  onExit?: MessageEmission[];  
  onAction?: Record<string, MessageEmission[]>; // Per action
}

interface MessageEmission {
  messageType: string;
  data: Record<string, any>;
  targetComponent?: string; // Optional specific target
  condition?: string; // When to emit
}
```

### 2. Component State Machine Integration

Each component has:
- **Internal state machine** (using FSL)
- **Message emission rules** for each state
- **Message consumption rules** for inputs
- **Action definitions** that are state-aware

```typescript
interface ComposableComponent {
  id: string;
  name: string;
  
  // Internal state machine
  stateMachine: {
    fsl: string;
    states: ComponentState[];
    actions: Record<string, ComponentAction[]>; // Actions per state
  };
  
  // Message handling
  messageEmissions: StateMessageEmitter[];
  messageConsumption: MessageConsumer[];
  
  // External interface
  inputs: ComponentPort[];
  outputs: ComponentPort[];
}
```

### 3. Examples of State-Based Components

#### Queue Component
```fsl
idle 'message_received' -> accumulating;
accumulating 'message_received' -> accumulating;
accumulating 'threshold_reached' -> flushing;
flushing 'batch_sent' -> idle;
```

**State Actions & Emissions:**
- `accumulating` state: 
  - Action: Add message to queue
  - Emission: Progress update messages
- `flushing` state:
  - Action: Send batch to output
  - Emission: `batch_ready` message with queue contents

#### Aggregator Component  
```fsl
idle 'data_received' -> processing;
processing 'calculation_done' -> idle;
```

**State Actions & Emissions:**
- `processing` state:
  - Action: Calculate sum/average/etc
  - Emission: `aggregation_complete` with result

#### Splitter Component
```fsl
idle 'input_received' -> evaluating;
evaluating 'condition_met' -> routing_positive;
evaluating 'condition_failed' -> routing_negative;
routing_positive 'message_sent' -> idle;
routing_negative 'message_sent' -> idle;
```

**State Actions & Emissions:**
- `routing_positive` state:
  - Emission: Message to positive output port
- `routing_negative` state:
  - Emission: Message to negative output port

### 4. Message Routing System

The component compiler creates a **message bus** that routes messages between components based on:

1. **State-based emissions** (when a component state emits a message)
2. **Input port subscriptions** (what messages a component listens for)
3. **Connection definitions** (explicit routing rules)

```typescript
interface MessageRoute {
  from: {
    componentId: string;
    stateId: string;
    messageType: string;
  };
  to: {
    componentId: string;
    inputPort: string;
  };
  transform?: MessageTransform;
  condition?: string;
}

class MessageBus {
  routes: MessageRoute[] = [];
  
  // Called when a state emits a message
  handleStateEmission(componentId: string, stateId: string, message: any) {
    const matchingRoutes = this.routes.filter(r => 
      r.from.componentId === componentId && 
      r.from.stateId === stateId &&
      r.from.messageType === message.type
    );
    
    matchingRoutes.forEach(route => {
      this.deliverMessage(route.to.componentId, route.to.inputPort, message);
    });
  }
}
```

### 5. Compilation to Single State Machine

The **ComponentComposer** takes multiple connected components and compiles them into a single PLED-compatible state machine:

```typescript
class ComponentComposer {
  static compileComponents(components: ComposableComponent[], connections: MessageRoute[]): PledTemplate {
    // 1. Merge all component state machines
    const mergedStates = this.mergeStateMachines(components);
    
    // 2. Create message rules from state emissions + connections
    const messageRules = this.createMessageRules(components, connections);
    
    // 3. Create action definitions from state actions
    const actions = this.mergeStateActions(components);
    
    // 4. Generate single FSL from connected components
    const fsl = this.generateComposedFSL(components, connections);
    
    return {
      stateMachine: { fsl },
      messageRules,
      actions,
      // ... other PLED template fields
    };
  }
}
```

### 6. Carbon Credit Example Implementation

#### IoT Validator Component
```typescript
{
  stateMachine: {
    fsl: "idle 'measurement_received' -> validating; validating 'signature_valid' -> idle; validating 'signature_invalid' -> error;",
    states: [
      { id: 'validating', actions: ['validate_signature'] },
      { id: 'error', actions: ['log_error'] }
    ]
  },
  messageEmissions: [
    {
      stateId: 'idle', // After validation succeeds
      onExit: [{
        messageType: 'validated_measurement',
        data: { measurement: '{{validated_data}}' },
        condition: 'validation_success'
      }]
    }
  ]
}
```

#### Queue Component (receives validated measurements)
```typescript
{
  messageConsumption: [
    {
      inputPort: 'input',
      messageType: 'validated_measurement',
      action: 'add_to_queue'
    }
  ],
  messageEmissions: [
    {
      stateId: 'flushing',
      onEnter: [{
        messageType: 'batch_ready',
        data: { batch: '{{queue_contents}}' }
      }]
    }
  ]
}
```

#### Token Creator Component (receives batches)
```typescript
{
  messageConsumption: [
    {
      inputPort: 'measurements',
      messageType: 'batch_ready',
      action: 'create_tokens'
    }
  ],
  messageEmissions: [
    {
      stateId: 'token_created',
      onEnter: [{
        messageType: 'tokens_generated',
        data: { tokens: '{{created_tokens}}' }
      }]
    }
  ]
}
```

## Key Benefits

1. **State-Centric Design**: Aligns with PLED's action-based state architecture
2. **Composability**: Build complex workflows from simple components
3. **Reusability**: Components can be reused across different workflows
4. **Message Flow Clarity**: Clear understanding of what messages flow between which states
5. **Single State Machine Output**: Compiles to standard PLED template format
6. **Debugging**: Can trace message flow through composed components

## Implementation Priority

1. ✅ **Component Library**: Basic components (queue, aggregator, splitter)
2. 🔄 **Message Emission System**: State-based message emission
3. ⏳ **Message Bus**: Routing messages between components  
4. ⏳ **Component Compiler**: Compile to single state machine
5. ⏳ **Visual Builder**: UI for connecting components
6. ⏳ **Testing Framework**: Validate composed workflows