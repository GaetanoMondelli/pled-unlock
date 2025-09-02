import { z } from 'zod';

export const SourceTokenSummarySchema = z.object({
  id: z.string(),
  originNodeId: z.string(),
  originalValue: z.any(),
  createdAt: z.number(),
});
export type SourceTokenSummary = z.infer<typeof SourceTokenSummarySchema>;

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
  type: z.literal('DataSource'),
  interval: z.number().positive(),
  valueMin: z.number(),
  valueMax: z.number(),
  destinationNodeId: z.string(),
});
export type DataSourceNode = z.infer<typeof DataSourceNodeSchema>;

export const AggregationMethodSchema = z.enum(['sum', 'average', 'count', 'first', 'last']);
export type AggregationMethod = z.infer<typeof AggregationMethodSchema>;

export const QueueNodeSchema = BaseNodeSchema.extend({
  type: z.literal('Queue'),
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
  type: z.literal('ProcessNode'),
  inputNodeIds: z.array(z.string()).min(1),
  outputs: z.array(ProcessNodeOutputSchema).min(1),
});
export type ProcessNode = z.infer<typeof ProcessNodeSchema>;

export const SinkNodeSchema = BaseNodeSchema.extend({
  type: z.literal('Sink'),
});
export type SinkNode = z.infer<typeof SinkNodeSchema>;

export const AnyNodeSchema = z.union([
  DataSourceNodeSchema,
  QueueNodeSchema,
  ProcessNodeSchema,
  SinkNodeSchema,
]);
export type AnyNode = z.infer<typeof AnyNodeSchema>;

export const ScenarioSchema = z.object({
  nodes: z.array(AnyNodeSchema),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

// Simulation-specific state types
export interface NodeState {
  lastProcessedTime?: number;
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
  type: AnyNode['type'];
  config: AnyNode;
  isActive?: boolean;
  error?: string;
  details?: string;
}

export interface RFEdgeData {
  animated?: boolean;
}