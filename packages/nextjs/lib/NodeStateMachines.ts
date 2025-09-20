// State machine definitions for each node type

export type NodeState =
  | 'IDLE'
  | 'EMITTING'
  | 'WAITING'
  | 'BUFFERING'
  | 'AGGREGATING'
  | 'OUTPUTTING'
  | 'PROCESSING'
  | 'CONSUMING';

export type NodeStateMachine = {
  states: NodeState[];
  transitions: Record<string, { from: NodeState; to: NodeState; event: string }>;
  initialState: NodeState;
  finalStates?: NodeState[];
};

export const DataSourceStateMachine: NodeStateMachine = {
  states: ['IDLE', 'EMITTING'],
  initialState: 'IDLE',
  transitions: {
    'EMIT_TOKEN': { from: 'IDLE', to: 'EMITTING', event: 'EMIT_TOKEN' },
    'EMISSION_COMPLETE': { from: 'EMITTING', to: 'IDLE', event: 'EMISSION_COMPLETE' }
  }
};

export const QueueStateMachine: NodeStateMachine = {
  states: ['WAITING', 'BUFFERING', 'AGGREGATING', 'OUTPUTTING'],
  initialState: 'WAITING',
  transitions: {
    'RECEIVE_TOKEN': { from: 'WAITING', to: 'BUFFERING', event: 'RECEIVE_TOKEN' },
    'DROP_TOKEN': { from: 'WAITING', to: 'WAITING', event: 'DROP_TOKEN' },
    'START_AGGREGATION': { from: 'BUFFERING', to: 'AGGREGATING', event: 'START_AGGREGATION' },
    'COMPLETE_AGGREGATION': { from: 'AGGREGATING', to: 'OUTPUTTING', event: 'COMPLETE_AGGREGATION' },
    'FORWARD_TOKEN': { from: 'OUTPUTTING', to: 'WAITING', event: 'FORWARD_TOKEN' }
  }
};

export const ProcessNodeStateMachine: NodeStateMachine = {
  states: ['WAITING', 'PROCESSING', 'OUTPUTTING'],
  initialState: 'WAITING',
  transitions: {
    'RECEIVE_TOKEN': { from: 'WAITING', to: 'WAITING', event: 'RECEIVE_TOKEN' },
    'START_PROCESSING': { from: 'WAITING', to: 'PROCESSING', event: 'START_PROCESSING' },
    'COMPLETE_PROCESSING': { from: 'PROCESSING', to: 'OUTPUTTING', event: 'COMPLETE_PROCESSING' },
    'OUTPUT_COMPLETE': { from: 'OUTPUTTING', to: 'WAITING', event: 'OUTPUT_COMPLETE' }
  }
};

export const SinkStateMachine: NodeStateMachine = {
  states: ['IDLE', 'CONSUMING'],
  initialState: 'IDLE',
  transitions: {
    'CONSUME_TOKEN': { from: 'IDLE', to: 'CONSUMING', event: 'CONSUME_TOKEN' },
    'CONSUMPTION_COMPLETE': { from: 'CONSUMING', to: 'IDLE', event: 'CONSUMPTION_COMPLETE' }
  }
};

export const getStateMachineForNodeType = (nodeType: string): NodeStateMachine => {
  switch (nodeType) {
    case 'DataSource': return DataSourceStateMachine;
    case 'Queue': return QueueStateMachine;
    case 'ProcessNode': return ProcessNodeStateMachine;
    case 'Sink': return SinkStateMachine;
    default:
      throw new Error(`Unknown node type: ${nodeType}`);
  }
};

export const getStateColor = (state: NodeState): string => {
  switch (state) {
    case 'IDLE': return '#94a3b8'; // slate-400
    case 'WAITING': return '#94a3b8'; // slate-400
    case 'EMITTING': return '#22c55e'; // green-500
    case 'BUFFERING': return '#3b82f6'; // blue-500
    case 'AGGREGATING': return '#f59e0b'; // amber-500
    case 'OUTPUTTING': return '#22c55e'; // green-500
    case 'PROCESSING': return '#f59e0b'; // amber-500
    case 'CONSUMING': return '#ef4444'; // red-500
    default: return '#6b7280'; // gray-500
  }
};