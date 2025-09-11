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

export const DataSourceNodeSchema = BaseNodeSchema.extend({
  type: z.literal("DataSource"),
  interval: z.number().positive(),
  valueMin: z.number(),
  valueMax: z.number(),
  destinationNodeId: z.string(),
});
export type DataSourceNode = z.infer<typeof DataSourceNodeSchema>;

export const AggregationMethodSchema = z.enum(["sum", "average", "count", "first", "last"]);
export type AggregationMethod = z.infer<typeof AggregationMethodSchema>;

export const QueueNodeSchema = BaseNodeSchema.extend({
  type: z.literal("Queue"),
  timeWindow: z.number().positive(),
  aggregationMethod: AggregationMethodSchema,
  capacity: z.number().positive().optional(),
  destinationNodeId: z.string(),
});
export type QueueNode = z.infer<typeof QueueNodeSchema>;

export const ProcessNodeOutputSchema = z.object({
  formula: z.string(),
  destinationNodeId: z.string(),
});
export type ProcessNodeOutput = z.infer<typeof ProcessNodeOutputSchema>;

export const ProcessNodeSchema = BaseNodeSchema.extend({
  type: z.literal("ProcessNode"),
  inputNodeIds: z.array(z.string()).min(1),
  outputs: z.array(ProcessNodeOutputSchema).min(1),
});
export type ProcessNode = z.infer<typeof ProcessNodeSchema>;

export const SinkNodeSchema = BaseNodeSchema.extend({
  type: z.literal("Sink"),
});
export type SinkNode = z.infer<typeof SinkNodeSchema>;

export const AnyNodeSchema = z.union([DataSourceNodeSchema, QueueNodeSchema, ProcessNodeSchema, SinkNodeSchema]);
export type AnyNode = z.infer<typeof AnyNodeSchema>;

export const ScenarioSchema = z.object({
  nodes: z.array(AnyNodeSchema),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

// State machine state definitions
export type NodeStateMachineState = 
  | "source_idle" | "source_generating" | "source_emitting" | "source_waiting"
  | "queue_idle" | "queue_accumulating" | "queue_processing" | "queue_emitting"
  | "process_idle" | "process_collecting" | "process_calculating" | "process_emitting"
  | "splitter_idle" | "splitter_evaluating" | "splitter_route_output1" | "splitter_route_output2"
  | "sink_idle" | "sink_processing";

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

export interface SinkState extends NodeState {
  consumedTokenCount: number;
  lastConsumedTime?: number;
  consumedTokens: Token[];
}

export type AnyNodeState = DataSourceState | QueueState | ProcessNodeState | SinkState;

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
