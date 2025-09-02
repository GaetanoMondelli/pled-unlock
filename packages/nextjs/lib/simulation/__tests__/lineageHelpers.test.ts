/**
 * Unit tests for enhanced lineage tracking helpers
 */
import {
  calculateGenerationLevel,
  createAggregationCalculation,
  createAggregationDetails,
  createEnhancedSourceTokenSummaries,
  createLineageMetadata,
  createTransformationCalculation,
  createTransformationDetails,
  determineOperationType,
  extractUltimateSources,
} from "../lineageHelpers";
import type { AggregationMethod, HistoryEntry, Token } from "../types";
import { describe, expect, it } from "vitest";

describe("lineageHelpers", () => {
  // Helper function to create a test token
  const createTestToken = (
    id: string,
    value: any,
    originNodeId: string,
    createdAt: number = 100,
    history: HistoryEntry[] = [],
  ): Token => ({
    id,
    value,
    createdAt,
    originNodeId,
    history: [
      {
        timestamp: createdAt,
        epochTimestamp: Date.now(),
        sequence: 0,
        nodeId: originNodeId,
        action: "CREATED",
        value,
        details: `Token ${id}`,
        operationType: "creation",
        lineageMetadata: {
          generationLevel: 0,
          ultimateSources: [id],
          operationType: "creation",
        },
      },
      ...history,
    ],
  });

  describe("calculateGenerationLevel", () => {
    it("should return 0 for tokens with no source tokens (DataSource)", () => {
      const result = calculateGenerationLevel([]);
      expect(result).toBe(0);
    });

    it("should return 1 for tokens derived from DataSource tokens", () => {
      const sourceToken = createTestToken("source1", 5, "DataSource1");
      const result = calculateGenerationLevel([sourceToken]);
      expect(result).toBe(1);
    });

    it("should return correct level for multi-generation tokens", () => {
      const rootToken = createTestToken("root1", 5, "DataSource1");

      const level1Token = createTestToken("level1", 10, "Queue1", 200, [
        {
          timestamp: 200,
          epochTimestamp: Date.now(),
          sequence: 1,
          nodeId: "Queue1",
          action: "AGGREGATED_SUM",
          value: 10,
          operationType: "aggregation",
          lineageMetadata: {
            generationLevel: 1,
            ultimateSources: ["root1"],
            operationType: "aggregation",
          },
        },
      ]);

      const result = calculateGenerationLevel([level1Token]);
      expect(result).toBe(2);
    });

    it("should handle multiple source tokens with different generation levels", () => {
      const rootToken = createTestToken("root1", 5, "DataSource1");

      const level2Token = createTestToken("level2", 15, "ProcessNode1", 300, [
        {
          timestamp: 300,
          epochTimestamp: Date.now(),
          sequence: 2,
          nodeId: "ProcessNode1",
          action: "OUTPUT_GENERATED",
          value: 15,
          operationType: "transformation",
          lineageMetadata: {
            generationLevel: 2,
            ultimateSources: ["root1"],
            operationType: "transformation",
          },
        },
      ]);

      const result = calculateGenerationLevel([rootToken, level2Token]);
      expect(result).toBe(3); // max(0, 2) + 1
    });
  });

  describe("extractUltimateSources", () => {
    it("should return empty array for no source tokens", () => {
      const result = extractUltimateSources([]);
      expect(result).toEqual([]);
    });

    it("should extract ultimate sources from token lineage metadata", () => {
      const token = createTestToken("token1", 10, "Queue1", 200, [
        {
          timestamp: 200,
          epochTimestamp: Date.now(),
          sequence: 1,
          nodeId: "Queue1",
          action: "AGGREGATED_SUM",
          value: 10,
          operationType: "aggregation",
          lineageMetadata: {
            generationLevel: 1,
            ultimateSources: ["root1", "root2"],
            operationType: "aggregation",
          },
        },
      ]);

      const result = extractUltimateSources([token]);
      expect(result).toEqual(["root1", "root2"]);
    });

    it("should use token ID as ultimate source if no lineage metadata found", () => {
      const token = createTestToken("source1", 5, "DataSource1");
      // Remove lineage metadata from history
      token.history = [
        {
          timestamp: 100,
          epochTimestamp: Date.now(),
          sequence: 0,
          nodeId: "DataSource1",
          action: "CREATED",
          value: 5,
          details: "Token source1",
        },
      ];

      const result = extractUltimateSources([token]);
      expect(result).toEqual(["source1"]);
    });

    it("should combine ultimate sources from multiple tokens", () => {
      const token1 = createTestToken("token1", 10, "Queue1", 200, [
        {
          timestamp: 200,
          epochTimestamp: Date.now(),
          sequence: 1,
          nodeId: "Queue1",
          action: "AGGREGATED_SUM",
          value: 10,
          operationType: "aggregation",
          lineageMetadata: {
            generationLevel: 1,
            ultimateSources: ["root1", "root2"],
            operationType: "aggregation",
          },
        },
      ]);

      const token2 = createTestToken("token2", 15, "Queue2", 250, [
        {
          timestamp: 250,
          epochTimestamp: Date.now(),
          sequence: 2,
          nodeId: "Queue2",
          action: "AGGREGATED_AVERAGE",
          value: 15,
          operationType: "aggregation",
          lineageMetadata: {
            generationLevel: 1,
            ultimateSources: ["root3"],
            operationType: "aggregation",
          },
        },
      ]);

      const result = extractUltimateSources([token1, token2]);
      expect(result.sort()).toEqual(["root1", "root2", "root3"]);
    });
  });

  describe("createAggregationCalculation", () => {
    it("should create correct sum calculation", () => {
      const inputTokens = [
        { tokenId: "token1", value: 5, contribution: 0.25 },
        { tokenId: "token2", value: 7, contribution: 0.35 },
        { tokenId: "token3", value: 8, contribution: 0.4 },
      ];

      const result = createAggregationCalculation("sum", inputTokens, 20);
      expect(result).toBe("sum(5, 7, 8) = 5 + 7 + 8 = 20");
    });

    it("should create correct average calculation", () => {
      const inputTokens = [
        { tokenId: "token1", value: 6, contribution: 2 },
        { tokenId: "token2", value: 9, contribution: 3 },
        { tokenId: "token3", value: 12, contribution: 4 },
      ];

      const result = createAggregationCalculation("average", inputTokens, 9);
      expect(result).toBe("avg(6, 9, 12) = (6 + 9 + 12)/3 = 27/3 = 9");
    });

    it("should create correct count calculation", () => {
      const inputTokens = [
        { tokenId: "token1", value: "a", contribution: 0.33 },
        { tokenId: "token2", value: "b", contribution: 0.33 },
        { tokenId: "token3", value: "c", contribution: 0.33 },
      ];

      const result = createAggregationCalculation("count", inputTokens, 3);
      expect(result).toBe("count([token1, token2, token3]) = 3");
    });

    it("should create correct first calculation", () => {
      const inputTokens = [
        { tokenId: "token1", value: "first", contribution: 1 },
        { tokenId: "token2", value: "second", contribution: 0 },
      ];

      const result = createAggregationCalculation("first", inputTokens, "first");
      expect(result).toBe("first([token1, token2]) = token1 (value: first)");
    });

    it("should create correct last calculation", () => {
      const inputTokens = [
        { tokenId: "token1", value: "first", contribution: 0 },
        { tokenId: "token2", value: "last", contribution: 1 },
      ];

      const result = createAggregationCalculation("last", inputTokens, "last");
      expect(result).toBe("last([token1, token2]) = token2 (value: last)");
    });
  });

  describe("createAggregationDetails", () => {
    it("should create complete aggregation details for sum", () => {
      const sourceTokens = [
        createTestToken("token1", 5, "DataSource1"),
        createTestToken("token2", 7, "DataSource2"),
        createTestToken("token3", 8, "DataSource3"),
      ];

      const result = createAggregationDetails("sum", sourceTokens, 20);

      expect(result.method).toBe("sum");
      expect(result.resultValue).toBe(20);
      expect(result.calculation).toBe("sum(5, 7, 8) = 5 + 7 + 8 = 20");
      expect(result.inputTokens).toHaveLength(3);
      expect(result.inputTokens[0]).toEqual({
        tokenId: "token1",
        value: 5,
        contribution: 0.25, // 5/20
      });
    });

    it("should create complete aggregation details for average", () => {
      const sourceTokens = [createTestToken("token1", 6, "DataSource1"), createTestToken("token2", 9, "DataSource2")];

      const result = createAggregationDetails("average", sourceTokens, 7.5);

      expect(result.method).toBe("average");
      expect(result.resultValue).toBe(7.5);
      expect(result.calculation).toBe("avg(6, 9) = (6 + 9)/2 = 15/2 = 7.5");
      expect(result.inputTokens[0].contribution).toBe(3); // 6/2
      expect(result.inputTokens[1].contribution).toBe(4.5); // 9/2
    });
  });

  describe("createTransformationCalculation", () => {
    it("should create readable transformation calculation", () => {
      const formula = "inputs.Queue1.value + inputs.Queue2.value * 2";
      const inputMapping = {
        Queue1: { value: 5 },
        Queue2: { value: 3 },
      };

      const result = createTransformationCalculation(formula, inputMapping, 11);
      expect(result).toBe("inputs.Queue1.value + inputs.Queue2.value * 2 = 5 + 3 * 2 = 11");
    });

    it("should handle complex formulas", () => {
      const formula = "Math.max(inputs.A.value, inputs.B.value)";
      const inputMapping = {
        A: { value: 10 },
        B: { value: 7 },
      };

      const result = createTransformationCalculation(formula, inputMapping, 10);
      expect(result).toBe("Math.max(inputs.A.value, inputs.B.value) = Math.max(10, 7) = 10");
    });
  });

  describe("createTransformationDetails", () => {
    it("should create complete transformation details", () => {
      const formula = "inputs.Queue1.value + 10";
      const inputMapping = { Queue1: { value: 5 } };
      const resultValue = 15;

      const result = createTransformationDetails(formula, inputMapping, resultValue);

      expect(result.formula).toBe(formula);
      expect(result.inputMapping).toEqual(inputMapping);
      expect(result.resultValue).toBe(resultValue);
      expect(result.calculation).toBe("inputs.Queue1.value + 10 = 5 + 10 = 15");
    });
  });

  describe("createEnhancedSourceTokenSummaries", () => {
    it("should create enhanced summaries with lineage information", () => {
      const sourceTokens = [
        createTestToken("token1", 5, "DataSource1"),
        createTestToken("token2", 7, "Queue1", 200, [
          {
            timestamp: 200,
            epochTimestamp: Date.now(),
            sequence: 1,
            nodeId: "Queue1",
            action: "AGGREGATED_SUM",
            value: 7,
            sourceTokenIds: ["root1"],
            operationType: "aggregation",
            lineageMetadata: {
              generationLevel: 1,
              ultimateSources: ["root1"],
              operationType: "aggregation",
            },
          },
        ]),
      ];

      const result = createEnhancedSourceTokenSummaries(sourceTokens);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "token1",
        originNodeId: "DataSource1",
        originalValue: 5,
        createdAt: 100,
        completeLineage: [],
        generationLevel: 0,
        ultimateSources: ["token1"],
      });
      expect(result[1]).toEqual({
        id: "token2",
        originNodeId: "Queue1",
        originalValue: 7,
        createdAt: 200,
        completeLineage: ["root1"],
        generationLevel: 1,
        ultimateSources: ["root1"],
      });
    });
  });

  describe("createLineageMetadata", () => {
    it("should create metadata for creation operation", () => {
      const result = createLineageMetadata("creation", [], "newToken1");

      expect(result).toEqual({
        generationLevel: 0,
        ultimateSources: ["newToken1"],
        operationType: "creation",
      });
    });

    it("should create metadata for aggregation operation", () => {
      const sourceTokens = [createTestToken("token1", 5, "DataSource1"), createTestToken("token2", 7, "DataSource2")];

      const result = createLineageMetadata("aggregation", sourceTokens, "aggToken1");

      expect(result.generationLevel).toBe(1);
      expect(result.operationType).toBe("aggregation");
      expect(result.ultimateSources).toEqual(["token1", "token2"]);
    });
  });

  describe("determineOperationType", () => {
    it("should correctly identify operation types", () => {
      expect(determineOperationType("CREATED")).toBe("creation");
      expect(determineOperationType("AGGREGATED_SUM")).toBe("aggregation");
      expect(determineOperationType("AGGREGATED_AVERAGE")).toBe("aggregation");
      expect(determineOperationType("OUTPUT_GENERATED")).toBe("transformation");
      expect(determineOperationType("TOKEN_CONSUMED_FOR_AGGREGATION")).toBe("consumption");
      expect(determineOperationType("CONSUMED_BY_SINK_NODE")).toBe("consumption");
      expect(determineOperationType("TOKEN_FORWARDED_FROM_OUTPUT")).toBe("transfer");
      expect(determineOperationType("TOKEN_ARRIVED_AT_NODE")).toBe("transfer");
      expect(determineOperationType("UNKNOWN_ACTION")).toBe("transfer");
    });
  });
});
