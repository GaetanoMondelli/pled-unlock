# Enhanced FSM Node Documentation

## Overview

The Enhanced FSM (Finite State Machine) Node represents a significant evolution from the original state machine implementation, bringing together the power of the original event-message architecture with the modern workflow-based approach. This implementation restores and enhances the key capabilities that were missing from the previous iteration.

## Key Features Restored

### 1. Dual Input Stream Architecture

The Enhanced FSM Node supports two distinct input types:

- **Events**: Raw, unstructured data (emails, documents, sensor readings, API responses)
- **Messages**: Structured, processed tokens that directly trigger state transitions

This separation allows for flexible processing where events are interpreted into actionable messages through configurable rules.

### 2. Flexible Event Interpretation Engine

Events are transformed into messages using multiple interpretation methods:

- **Pattern Matching**: Regex-based extraction from text content
- **Formula Evaluation**: JavaScript expressions for data transformation
- **AI/LLM Integration**: Natural language processing for intent recognition
- **Custom Scripts**: Full JavaScript execution for complex logic
- **Pass-through**: Direct conversion with field mapping

### 3. Enhanced Action System

Actions can now generate multiple output types:

- **Token Emission**: Traditional workflow token output
- **Event Generation**: Create new events for feedback loops
- **Message Creation**: Generate structured messages
- **API Calls**: External system integration
- **Email Notifications**: Automated communications
- **Variable Updates**: State and global variable manipulation
- **Logging**: Structured logging with multiple levels

### 4. Feedback Loop Management

Sophisticated feedback control with:

- **Circuit Breakers**: Prevent system overload
- **Depth Tracking**: Monitor recursion levels
- **Loop Detection**: Identify and prevent infinite loops
- **Routing Control**: Manage feedback flow between nodes

## Architecture

```
Events ──┐
         ├──► Interpretation Rules ──► Messages ──► State Machine ──► Actions ──► Outputs
Messages ─┘                                            │                          │
                                                       │                          │
                                              State Variables                     │
                                                       ▲                          │
                                                       │                          │
                                                   Feedback ◄────────────────────┘
```

## Configuration Structure

### Event Inputs

```typescript
interface EventInput {
  name: string;
  description?: string;
  eventTypes?: string[];     // Accepted event types
  required: boolean;
  bufferSize: number;        // Max events to buffer
}
```

### Message Inputs

```typescript
interface MessageInput {
  name: string;
  description?: string;
  messageTypes?: string[];   // Accepted message types
  required: boolean;
  interface: Interface;      // Schema validation
  bufferSize: number;        // Max messages to buffer
}
```

### Interpretation Rules

```typescript
interface EventInterpretationRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;          // Higher = processed first
  conditions: {
    eventTypes?: string[];
    eventPattern?: string;   // Regex pattern
    metadata?: Record<string, any>;
    sourceTypes?: ("external" | "internal" | "feedback")[];
  };
  method: PatternMethod | FormulaMethod | AIMethod | ScriptMethod | PassthroughMethod;
}
```

#### Pattern Method Example

```typescript
{
  type: "pattern",
  patterns: [
    {
      pattern: /please\s+sign\s+(.+)/i,
      messageType: "signature_requested",
      extractFields: {
        document: "$1"
      }
    }
  ]
}
```

#### AI Method Example

```typescript
{
  type: "ai",
  model: "gpt-4",
  prompt: "Analyze this email and determine the intent: {{event.data}}",
  messageTypes: ["contract_negotiation", "payment_request", "support_request"],
  confidenceThreshold: 0.7
}
```

### Enhanced States

```typescript
interface EnhancedFSMState {
  id: string;
  name: string;
  type: "initial" | "intermediate" | "final" | "error";
  description?: string;
  timeout?: number;          // Auto-transition timeout
  variables?: Record<string, any>;  // State-specific variables
  actions?: EnhancedFSMAction[];    // Actions to execute
}
```

### Enhanced Transitions

```typescript
interface EnhancedFSMTransition {
  id: string;
  from: string;
  to: string;
  trigger: MessageTrigger | EventTrigger | TimerTrigger | ConditionTrigger | ManualTrigger;
  actions?: EnhancedFSMAction[];
  guard?: string;            // Additional condition
  priority: number;
}
```

### Enhanced Actions

```typescript
interface EnhancedFSMAction {
  id: string;
  name: string;
  enabled: boolean;
  trigger: "onEntry" | "onExit" | "onTransition" | "onMessage" | "onEvent";
  outputs: ActionOutput[];
  onError: "stop" | "continue" | "retry";
  retryCount: number;
  timeout: number;
}
```

#### Action Output Types

```typescript
// Token emission (traditional)
{
  outputType: "token",
  formula: "input.data.value * 2",
  destinationNodeId: "next_node"
}

// Event generation (feedback)
{
  outputType: "event",
  eventType: "processing_complete",
  data: { result: "{{variables.result}}" },
  targetStream: "self"
}

// API call
{
  outputType: "api_call",
  method: "POST",
  url: "/api/external-service",
  body: { data: "{{input.payload}}" },
  responseMapping: { result: "response.id" }
}

// Email notification
{
  outputType: "email",
  to: "{{input.recipient}}",
  subject: "Process Complete",
  body: "Your request has been processed."
}
```

### Feedback Loop Configuration

```typescript
interface FeedbackLoopConfig {
  enabled: boolean;
  maxDepth: number;          // Maximum recursion depth
  circuitBreaker: {
    enabled: boolean;
    threshold: number;       // Events per time window
    timeWindow: number;      // Time window in ms
    cooldownPeriod: number;  // Cooldown after trip
  };
  routing: {
    allowSelfFeedback: boolean;
    allowExternalFeedback: boolean;
    blacklistedNodes: string[];
  };
}
```

## Usage Examples

### 1. Email Processing FSM

Processes incoming emails and extracts signature requests, meeting invitations, and other intents:

```typescript
const emailFSM = createEmailProcessingFSM();
// Handles email events, uses AI interpretation, triggers DocuSign workflows
```

### 2. IoT Data Processing FSM

Validates sensor data, aggregates measurements, and triggers alerts:

```typescript
const iotFSM = createIoTDataProcessingFSM();
// Processes sensor readings, validates data quality, sends alerts
```

### 3. Document Approval FSM

Manages document approval workflows with escalation:

```typescript
const approvalFSM = createDocumentApprovalFSM();
// Tracks approval status, manages deadlines, handles escalations
```

## Best Practices

### Event Design

1. **Structure Events Consistently**: Use consistent schemas for similar event types
2. **Include Metadata**: Add context information for better interpretation
3. **Use Semantic Types**: Choose meaningful event type names

### Interpretation Rules

1. **Order by Priority**: Higher priority rules process first
2. **Use Specific Conditions**: Narrow conditions prevent conflicts
3. **Test Patterns Thoroughly**: Validate regex patterns with real data
4. **Monitor AI Confidence**: Set appropriate confidence thresholds

### State Machine Design

1. **Keep States Focused**: Each state should have a clear purpose
2. **Design for Failure**: Include error states and recovery paths
3. **Use Timeouts**: Prevent indefinite waiting with reasonable timeouts
4. **Document Transitions**: Clear trigger conditions and expected behaviors

### Action Implementation

1. **Handle Errors Gracefully**: Use appropriate error handling strategies
2. **Set Reasonable Timeouts**: Prevent hanging operations
3. **Use Conditional Outputs**: Only execute when conditions are met
4. **Log Important Events**: Include debugging and audit information

### Feedback Loop Management

1. **Start Conservative**: Begin with lower depth limits and thresholds
2. **Monitor Circuit Breakers**: Watch for excessive triggering
3. **Design Termination Conditions**: Ensure feedback loops can end naturally
4. **Test Loop Scenarios**: Verify feedback behavior under various conditions

## Monitoring and Debugging

### Metrics to Track

- **Event Processing Rate**: Events per second by type
- **Message Generation Rate**: Messages created from events
- **State Transition Frequency**: Transitions per state
- **Action Execution Time**: Performance of individual actions
- **Feedback Loop Depth**: Current and maximum depths reached
- **Circuit Breaker Trips**: Frequency and causes of trips
- **Error Rates**: Failures by component and type

### Debug Information

- **Event Buffer Status**: Current buffer sizes and utilization
- **Rule Execution Results**: Which rules fired and their outputs
- **State Transition History**: Recent state changes with triggers
- **Variable Values**: Current state and global variables
- **Action Execution Logs**: Success/failure status and timing

### Common Issues and Solutions

#### High Circuit Breaker Trips
- **Cause**: Too many events in short time window
- **Solution**: Increase threshold or time window, optimize processing

#### Infinite Feedback Loops
- **Cause**: Actions creating events that trigger the same actions
- **Solution**: Add termination conditions, limit depth, review action logic

#### Low Message Generation
- **Cause**: Interpretation rules not matching events
- **Solution**: Review rule conditions, check event formats, adjust patterns

#### Slow Action Execution
- **Cause**: External API calls or complex processing
- **Solution**: Increase timeouts, add retry logic, optimize operations

## Integration with Existing System

The Enhanced FSM Node integrates seamlessly with the existing workflow architecture:

1. **Backward Compatibility**: Supports traditional token inputs and outputs
2. **Mixed Workflows**: Can be combined with Queue, Process, and other node types
3. **Shared Simulation Engine**: Uses the same simulation and visualization system
4. **Consistent UI**: Follows established design patterns and interactions

## Future Enhancements

Planned improvements include:

1. **Visual Rule Editor**: Drag-and-drop interface for creating interpretation rules
2. **Machine Learning Integration**: Adaptive rules that improve over time
3. **Advanced Analytics**: Deeper insights into FSM performance and behavior
4. **Template Library**: Pre-built FSM configurations for common use cases
5. **Real-time Collaboration**: Multi-user editing and configuration sharing

## Migration Guide

To migrate from the original FSM implementation:

1. **Identify Event Sources**: Determine what data should be treated as events vs messages
2. **Convert Message Rules**: Transform existing message processing into interpretation rules
3. **Update Action Definitions**: Migrate to the new action output system
4. **Configure Feedback**: Set up appropriate feedback loop controls
5. **Test Thoroughly**: Validate behavior matches expectations

The Enhanced FSM Node represents the culmination of lessons learned from both the original state machine implementation and the modern workflow system, providing a powerful, flexible foundation for complex event-driven processes.