/*
  Generates a machine-readable JSON Schema for the Workflow Protocol (v1.0).
  Output: ./lib/workflow/protocol.schema.json
*/
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://pledprotocol.dev/schema/workflow-protocol-1.0.json",
  title: "Workflow Protocol Scenario",
  type: "object",
  additionalProperties: false,
  required: ["version", "nodes"],
  properties: {
    version: { const: "1.0" },
    nodes: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/definitions/AnyProtocolNode" },
    },
  },
  definitions: {
    BaseNode: {
      type: "object",
      additionalProperties: false,
      required: ["nodeId", "displayName", "type"],
      properties: {
        nodeId: { type: "string", minLength: 1 },
        displayName: { type: "string", minLength: 1 },
        type: { type: "string" },
      },
    },
    DataSourceNode: {
      allOf: [
        { $ref: "#/definitions/BaseNode" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { const: "DataSource" },
            interval: { type: "number", exclusiveMinimum: 0 },
            valueMin: { type: "number" },
            valueMax: { type: "number" },
            destinationNodeId: { type: "string" },
          },
          required: ["interval", "valueMin", "valueMax", "destinationNodeId"],
        },
      ],
    },
    QueueNode: {
      allOf: [
        { $ref: "#/definitions/BaseNode" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { const: "Queue" },
            timeWindow: { type: "number", exclusiveMinimum: 0 },
            aggregationMethod: { enum: ["sum", "average", "count", "first", "last"] },
            capacity: { type: "number", exclusiveMinimum: 0 },
            destinationNodeId: { type: "string" },
          },
          required: ["timeWindow", "aggregationMethod", "destinationNodeId"],
        },
      ],
    },
    ProcessNodeOutput: {
      type: "object",
      additionalProperties: false,
      required: ["formula", "destinationNodeId"],
      properties: {
        formula: { type: "string", minLength: 1 },
        destinationNodeId: { type: "string" },
      },
    },
    ProcessNode: {
      allOf: [
        { $ref: "#/definitions/BaseNode" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { const: "ProcessNode" },
            inputNodeIds: {
              type: "array",
              minItems: 1,
              items: { type: "string" },
            },
            outputs: {
              type: "array",
              minItems: 1,
              items: { $ref: "#/definitions/ProcessNodeOutput" },
            },
          },
          required: ["inputNodeIds", "outputs"],
        },
      ],
    },
    SinkNode: {
      allOf: [
        { $ref: "#/definitions/BaseNode" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { const: "Sink" },
          },
        },
      ],
    },
    AnyProtocolNode: {
      oneOf: [
        { $ref: "#/definitions/DataSourceNode" },
        { $ref: "#/definitions/QueueNode" },
        { $ref: "#/definitions/ProcessNode" },
        { $ref: "#/definitions/SinkNode" },
      ],
    },
  },
} as const;

const outPath = join(__dirname, "../lib/workflow/protocol.schema.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(schema, null, 2), "utf-8");
console.log(`Generated JSON Schema at ${outPath}`);
