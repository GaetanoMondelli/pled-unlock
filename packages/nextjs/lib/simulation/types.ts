import { z } from "zod";

export const SourceTokenSummarySchema = z.object({
  id: z.string(),
  originNodeId: z.string(),
  originalValue: z.any(),
  createdAt: z.number(),
  // Enhanced lineage tracking - recursive source token details
  completeLineage: z.array(z.string()).optional(), // Array of ancestor token IDs back to sources
  generationLevel: z.number().optional(), // 0 for DataSource tokens, 1+ for derived
  ultimateSources: z.array(z.string()).optional(), // Token IDs of all ultimate source tokens
});
export type SourceTokenSummary = z.infer<typeof SourceTokenSummarySchema>;

// Enhanced aggregation details for detailed calculation breakdowns
export const AggregationDetailsSchema = z.object({
  method: z.enum(["sum", "average", "count", "first", "last"]),
  inputTokens: z.array(
    z.object({
      tokenId: z.string(),
      value: z.any(),
      contribution: z.number(), // For average: value/count, for sum: value/total, etc.
    }),
  ),
  calculation: z.string(), // e.g., "avg(5, 7, 9) = (5+7+9)/3 = 21/3 = 7"
  resultValue: z.any(),
});
export type AggregationDetails = z.infer<typeof AggregationDetailsSchema>;

// Enhanced transformation details for ProcessNode operations
export const TransformationDetailsSchema = z.object({
  formula: z.string(),
  inputMapping: z.record(z.string(), z.any()), // Maps input node IDs to their token values
  calculation: z.string(), // Human-readable calculation breakdown
  resultValue: z.any(),
});
export type TransformationDetails = z.infer<typeof TransformationDetailsSchema>;

// Lineage metadata for tracking generation levels and ultimate sources
export const LineageMetadataSchema = z.object({
  generationLevel: z.number(), // 0 for DataSource tokens, 1+ for derived tokens
  ultimateSources: z.array(z.string()), // Token IDs of all ultimate source tokens
  operationType: z.enum(["creation", "aggregation", "transformation", "consumption", "transfer"]),
});
export type LineageMetadata = z.infer<typeof LineageMetadataSchema>;

export const HistoryEntrySchema = z.object({
  timestamp: z.number(), // Simulation time
  epochTimestamp: z.number(), // Real-world event time
  sequence: z.number(), // Monotonically increasing event counter
  nodeId: z.string(),
  action: z.string(),
  value: z.any().optional(),
  sourceTokenIds: z.array(z.string()).optional(),
  sourceTokenSummaries: z.array(SourceTokenSummarySchema).optional(),
  details: z.string().optional(),

  // FSM STATE - SINGLE SOURCE OF TRUTH
  state: z.string(), // Current FSM state when this action occurred
  bufferSize: z.number().optional(), // Input buffer size at time of action
  outputBufferSize: z.number().optional(), // Output buffer size at time of action

  // Enhanced lineage tracking fields
  operationType: z.enum(["creation", "aggregation", "transformation", "consumption", "transfer"]).optional(),
  aggregationDetails: AggregationDetailsSchema.optional(),
  transformationDetails: TransformationDetailsSchema.optional(),
  lineageMetadata: LineageMetadataSchema.optional(),
});
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

export const TokenSchema = z.object({
  id: z.string(),
  value: z.any(),
  createdAt: z.number(), // Simulation time
  history: z.array(HistoryEntrySchema),
  originNodeId: z.string(),
});
export type Token = z.infer<typeof TokenSchema>;

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Position = z.infer<typeof PositionSchema>;

const BaseNodeSchema = z.object({
  nodeId: z.string(),
  displayName: z.string(),
  position: PositionSchema,
});

// V3 Schema Components
export const InterfaceSchema = z.object({
  type: z.string(),
  requiredFields: z.array(z.string()),
});
export type Interface = z.infer<typeof InterfaceSchema>;

export const GenerationConfigSchema = z.object({
  type: z.string(),
  valueMin: z.number(),
  valueMax: z.number(),
});
export type GenerationConfig = z.infer<typeof GenerationConfigSchema>;

export const AggregationTriggerSchema = z.object({
  type: z.string(),
  window: z.number().positive(),
});
export type AggregationTrigger = z.infer<typeof AggregationTriggerSchema>;

export const AggregationConfigSchema = z.object({
  method: z.string(),
  formula: z.string(),
  trigger: AggregationTriggerSchema,
});
export type AggregationConfig = z.infer<typeof AggregationConfigSchema>;

export const TransformationConfigSchema = z.object({
  formula: z.string(),
  fieldMapping: z.record(z.string(), z.string()),
});
export type TransformationConfig = z.infer<typeof TransformationConfigSchema>;

// V3 Input/Output schemas
export const InputV3Schema = z.object({
  name: z.string(),
  nodeId: z.string().optional(),
  sourceOutputName: z.string().optional(),
  interface: InterfaceSchema,
  alias: z.string().optional(),
  required: z.boolean(),
});
export type InputV3 = z.infer<typeof InputV3Schema>;

export const OutputV3Schema = z.object({
  name: z.string(),
  destinationNodeId: z.string(),
  destinationInputName: z.string(),
  interface: InterfaceSchema,
  transformation: TransformationConfigSchema.optional(),
});
export type OutputV3 = z.infer<typeof OutputV3Schema>;

// DataSource Schema
export const DataSourceNodeSchema = BaseNodeSchema.extend({
  type: z.literal("DataSource"),
  interval: z.number().positive(),
  outputs: z.array(OutputV3Schema),
  generation: GenerationConfigSchema,
});
export type DataSourceNode = z.infer<typeof DataSourceNodeSchema>;

// Queue Schema
export const QueueNodeSchema = BaseNodeSchema.extend({
  type: z.literal("Queue"),
  inputs: z.array(InputV3Schema),
  outputs: z.array(OutputV3Schema),
  aggregation: AggregationConfigSchema,
  capacity: z.number().positive().optional(),
});
export type QueueNode = z.infer<typeof QueueNodeSchema>;

// ProcessNode Schema
export const ProcessNodeSchema = BaseNodeSchema.extend({
  type: z.literal("ProcessNode"),
  inputs: z.array(InputV3Schema),
  outputs: z.array(OutputV3Schema),
});
export type ProcessNode = z.infer<typeof ProcessNodeSchema>;

// FSM State Actions - cleaner mapping like ProcessNode outputs
export const FSMStateActionsSchema = z.object({
  onEntry: z.record(z.string(), z.string()).optional(), // output_name: formula
  onExit: z.record(z.string(), z.string()).optional(), // output_name: formula
  logs: z.array(z.string()).optional(), // log messages
});
export type FSMStateActions = z.infer<typeof FSMStateActionsSchema>;

// FSM Transition Definition
export const FSMTransitionSchema = z.object({
  from: z.string(),
  to: z.string(),
  trigger: z.string(), // "token_received", "timer", "condition"
  condition: z.string().optional(), // formula to evaluate for conditional triggers
  guard: z.string().optional(), // additional guard condition
});
export type FSMTransition = z.infer<typeof FSMTransitionSchema>;

// FSM Output Configuration - dynamically inferred from emit actions
export const FSMOutputConfigSchema = z.object({
  name: z.string(), // output name referenced in emit actions
  interface: InterfaceSchema,
  destinationNodeId: z.string().optional(), // can be connected later
  destinationInputName: z.string().optional(),
});
export type FSMOutputConfig = z.infer<typeof FSMOutputConfigSchema>;

// FSM Definition - much cleaner structure
export const FSMDefinitionSchema = z.object({
  states: z.array(z.string()), // simple state names: ["idle", "processing", "emitting"]
  initialState: z.string(), // clearly defined initial state
  transitions: z.array(FSMTransitionSchema),
  variables: z.record(z.string(), z.any()).optional(), // state variables
  stateActions: z.record(z.string(), FSMStateActionsSchema).optional(), // state_name: actions
  outputs: z.array(z.string()).optional(), // output names that can be emitted
});
export type FSMDefinition = z.infer<typeof FSMDefinitionSchema>;

// FSMProcessNode Schema - native FSL-based processing node
export const FSMProcessNodeSchema = BaseNodeSchema.extend({
  type: z.literal("FSMProcessNode"),
  inputs: z.array(InputV3Schema),
  fsm: FSMDefinitionSchema, // Native FSL definition with dynamic outputs
  fsl: z.string().optional(), // Raw FSL string for display/editing
});
export type FSMProcessNode = z.infer<typeof FSMProcessNodeSchema>;

// Sink Schema
export const SinkNodeSchema = BaseNodeSchema.extend({
  type: z.literal("Sink"),
  inputs: z.array(InputV3Schema),
});
export type SinkNode = z.infer<typeof SinkNodeSchema>;

// Union type for all nodes
export const AnyNodeSchema = z.union([DataSourceNodeSchema, QueueNodeSchema, ProcessNodeSchema, FSMProcessNodeSchema, SinkNodeSchema]);
export type AnyNode = z.infer<typeof AnyNodeSchema>;

// Scenario Schema
export const ScenarioSchema = z.object({
  // Protocol V3 only; default to "3.0" if missing
  version: z.literal("3.0").default("3.0"),
  nodes: z.array(AnyNodeSchema),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

// State machine state definitions
export type NodeStateMachineState =
  | "source_idle" | "source_generating" | "source_emitting" | "source_waiting"
  | "queue_idle" | "queue_accumulating" | "queue_processing" | "queue_emitting"
  | "process_idle" | "process_collecting" | "process_ready" | "process_evaluating" | "process_outputting"
  | "splitter_idle" | "splitter_evaluating" | "splitter_route_output1" | "splitter_route_output2"
  | "sink_idle" | "sink_processing"
  | string; // Allow custom FSM states for FSMProcessNode

export interface StateMachineInfo {
  currentState: NodeStateMachineState;
  previousState?: NodeStateMachineState;
  stateChangedAt?: number;
  transitionHistory: Array<{
    from: NodeStateMachineState;
    to: NodeStateMachineState;
    timestamp: number;
    trigger?: string;
  }>;
}

// Simulation-specific state types
export interface NodeState {
  lastProcessedTime?: number;
  // State machine tracking
  stateMachine?: StateMachineInfo;
  [key: string]: any;
}

export interface DataSourceState extends NodeState {
  lastEmissionTime: number;
}

export interface QueueState extends NodeState {
  inputBuffer: Token[];
  outputBuffer: Token[];
  lastAggregationTime: number;
}

export interface ProcessNodeState extends NodeState {
  inputBuffers: Record<string, Token[]>;
  lastFiredTime?: number;
}

export interface FSMProcessNodeState extends NodeState {
  inputBuffers: Record<string, Token[]>;
  fsmVariables: Record<string, any>; // FSM state variables
  currentFSMState: string; // Current state in the FSM definition
  lastTransitionTime?: number;
}

export interface SinkState extends NodeState {
  consumedTokenCount: number;
  lastConsumedTime?: number;
  consumedTokens: Token[];
}

export type AnyNodeState = DataSourceState | QueueState | ProcessNodeState | FSMProcessNodeState | SinkState;

// For React Flow
export interface RFNodeData {
  label: string;
  type: AnyNode["type"];
  config: AnyNode;
  isActive?: boolean;
  error?: string;
  details?: string;
  // State machine information for display
  stateMachine?: {
    currentState: NodeStateMachineState;
    stateDisplayName?: string;
    transitionCount?: number;
  };
}

export interface RFEdgeData {
  animated?: boolean;
}
