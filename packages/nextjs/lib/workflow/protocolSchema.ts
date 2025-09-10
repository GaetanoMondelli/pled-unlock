import { z } from "zod";

// Versioned Workflow Protocol Schema (excludes render-only properties like position)

export const ProtocolVersionSchema = z.literal("1.0");
export type ProtocolVersion = z.infer<typeof ProtocolVersionSchema>;

const BaseProtocolNodeSchema = z.object({
  nodeId: z.string().min(1, "nodeId is required"),
  displayName: z.string().min(1, "displayName is required"),
});

export const AggregationMethodSchema = z.enum(["sum", "average", "count", "first", "last"]);
export type AggregationMethod = z.infer<typeof AggregationMethodSchema>;

export const DataSourceNodeSchema = BaseProtocolNodeSchema.extend({
  type: z.literal("DataSource"),
  interval: z.number().positive(),
  valueMin: z.number(),
  valueMax: z.number(),
  destinationNodeId: z.string(),
});
export type DataSourceNode = z.infer<typeof DataSourceNodeSchema>;

export const QueueNodeSchema = BaseProtocolNodeSchema.extend({
  type: z.literal("Queue"),
  timeWindow: z.number().positive(),
  aggregationMethod: AggregationMethodSchema,
  capacity: z.number().positive().optional(),
  destinationNodeId: z.string(),
});
export type QueueNode = z.infer<typeof QueueNodeSchema>;

export const ProcessNodeOutputSchema = z.object({
  formula: z.string().min(1),
  destinationNodeId: z.string(),
});
export type ProcessNodeOutput = z.infer<typeof ProcessNodeOutputSchema>;

export const ProcessNodeSchema = BaseProtocolNodeSchema.extend({
  type: z.literal("ProcessNode"),
  inputNodeIds: z.array(z.string()).min(1),
  outputs: z.array(ProcessNodeOutputSchema).min(1),
});
export type ProcessNode = z.infer<typeof ProcessNodeSchema>;

export const SinkNodeSchema = BaseProtocolNodeSchema.extend({
  type: z.literal("Sink"),
});
export type SinkNode = z.infer<typeof SinkNodeSchema>;

export const AnyProtocolNodeSchema = z.union([
  DataSourceNodeSchema,
  QueueNodeSchema,
  ProcessNodeSchema,
  SinkNodeSchema,
]);
export type AnyProtocolNode = z.infer<typeof AnyProtocolNodeSchema>;

export const ProtocolScenarioSchema = z.object({
  version: ProtocolVersionSchema.default("1.0"),
  nodes: z.array(AnyProtocolNodeSchema).min(1),
});
export type ProtocolScenario = z.infer<typeof ProtocolScenarioSchema>;

// Utility: strongly typed discriminated union by node type
export type NodeByType<T extends AnyProtocolNode["type"]> = Extract<AnyProtocolNode, { type: T }>;
