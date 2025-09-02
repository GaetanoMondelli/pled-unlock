/**
 * Tests for enhanced simulation store with improved lineage tracking
 */
import {
  calculateGenerationLevel,
  createAggregationDetails,
  createEnhancedSourceTokenSummaries,
  createLineageMetadata,
  createTransformationDetails,
  determineOperationType,
  extractUltimateSources,
} from "../lineageHelpers";
// Mock the simulation store functions we need to test
import type { AggregationDetails, HistoryEntry, LineageMetadata, Token, TransformationDetails } from "../types";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock nanoid to have predictable token IDs
vi.mock("@/lib/nanoid", () => ({
  nanoid: vi.fn(() => "test_token_id"),
}));

describe("Enhanced Simulation Store Integration", () => {
  let mockStore: {
    globalActivityLog: HistoryEntry[];
    eventCounter: number;
    _logNodeActivity: (nodeId: string, details: any, timestamp: number) => HistoryEntry;
    _createToken: (originNodeId: string, value: any, timestamp: number, sourceTokens?: Token[]) => Token;
  };

  beforeEach(() => {
    // Reset the mock store
    mockStore = {
      globalActivityLog: [],
      eventCounter: 0,
      _logNodeActivity: (nodeId: string, details: any, timestamp: number) => {
        const operationType = determineOperationType(details.action);

        const entry: HistoryEntry = {
          timestamp,
          epochTimestamp: Date.now(),
          sequence: mockStore.eventCounter++,
          nodeId,
          action: details.action,
          value: details.value,
          sourceTokenIds: details.sourceTokenIds,
          sourceTokenSummaries: details.sourceTokenSummaries,
          details: details.details,
          operationType,
          aggregationDetails: details.aggregationDetails,
          transformationDetails: details.transformationDetails,
          lineageMetadata: details.lineageMetadata,
        };

        mockStore.globalActivityLog.push(entry);
        return entry;
      },
      _createToken: (originNodeId: string, value: any, timestamp: number, sourceTokens: Token[] = []) => {
        const newToken: Token = {
          id: `token_${mockStore.eventCounter}`,
          value,
          createdAt: timestamp,
          originNodeId,
          history: [],
        };

        const sourceTokenIds = sourceTokens.map(t => t.id);
        const sourceTokenSummaries = createEnhancedSourceTokenSummaries(sourceTokens);
        const lineageMetadata = createLineageMetadata("creation", sourceTokens, newToken.id);

        const createLog = mockStore._logNodeActivity(
          originNodeId,
          {
            action: "CREATED",
            value: newToken.value,
            sourceTokenIds,
            sourceTokenSummaries,
            details: `Token ${newToken.id}`,
            lineageMetadata,
          },
          timestamp,
        );

        newToken.history.push(createLog);
        return newToken;
      },
    };
  });

  describe("Enhanced DataSource Token Creation", () => {
    it("should create DataSource tokens with complete lineage metadata", () => {
      const token = mockStore._createToken("DataSource1", 42, 100);

      expect(token.id).toBe("token_0");
      expect(token.value).toBe(42);
      expect(token.originNodeId).toBe("DataSource1");
      expect(token.createdAt).toBe(100);
      expect(token.history).toHaveLength(1);

      const createEntry = token.history[0];
      expect(createEntry.action).toBe("CREATED");
      expect(createEntry.operationType).toBe("creation");
      expect(createEntry.lineageMetadata).toEqual({
        generationLevel: 0,
        ultimateSources: [token.id],
        operationType: "creation",
      });
      expect(createEntry.sourceTokenSummaries).toEqual([]);

      // Verify global activity log
      expect(mockStore.globalActivityLog).toHaveLength(1);
      expect(mockStore.globalActivityLog[0]).toEqual(createEntry);
    });
  });

  describe("Enhanced Queue Aggregation", () => {
    it("should create aggregated tokens with detailed calculation breakdown", () => {
      // Create source tokens
      const sourceToken1 = mockStore._createToken("DataSource1", 5, 100);
      const sourceToken2 = mockStore._createToken("DataSource2", 7, 100);
      const sourceToken3 = mockStore._createToken("DataSource3", 8, 100);

      const sourceTokens = [sourceToken1, sourceToken2, sourceToken3];
      const aggregatedValue = 20; // sum

      // Create aggregated token
      const aggregatedToken = mockStore._createToken("Queue1", aggregatedValue, 200, sourceTokens);

      // Create detailed aggregation breakdown
      const aggregationDetails = createAggregationDetails("sum", sourceTokens, aggregatedValue);
      const lineageMetadata = createLineageMetadata("aggregation", sourceTokens, aggregatedToken.id);
      const enhancedSourceTokenSummaries = createEnhancedSourceTokenSummaries(sourceTokens);

      // Log the aggregation operation
      const aggregationEntry = mockStore._logNodeActivity(
        "Queue1",
        {
          action: "AGGREGATED_SUM",
          value: aggregatedValue,
          sourceTokenIds: sourceTokens.map(t => t.id),
          sourceTokenSummaries: enhancedSourceTokenSummaries,
          details: `${aggregationDetails.calculation}. Token ${aggregatedToken.id} placed in output buffer`,
          aggregationDetails,
          lineageMetadata,
        },
        200,
      );

      // Verify the aggregation log entry
      expect(aggregationEntry.operationType).toBe("aggregation");
      expect(aggregationEntry.aggregationDetails).toEqual({
        method: "sum",
        inputTokens: [
          { tokenId: sourceToken1.id, value: 5, contribution: 0.25 },
          { tokenId: sourceToken2.id, value: 7, contribution: 0.35 },
          { tokenId: sourceToken3.id, value: 8, contribution: 0.4 },
        ],
        calculation: "sum(5, 7, 8) = 5 + 7 + 8 = 20",
        resultValue: 20,
      });
      expect(aggregationEntry.lineageMetadata).toEqual({
        generationLevel: 1,
        ultimateSources: [sourceToken1.id, sourceToken2.id, sourceToken3.id],
        operationType: "aggregation",
      });

      // Verify enhanced source token summaries
      expect(enhancedSourceTokenSummaries).toHaveLength(3);
      expect(enhancedSourceTokenSummaries[0]).toEqual({
        id: sourceToken1.id,
        originNodeId: "DataSource1",
        originalValue: 5,
        createdAt: 100,
        completeLineage: [],
        generationLevel: 0,
        ultimateSources: [sourceToken1.id],
      });

      // Verify global activity log contains all entries
      expect(mockStore.globalActivityLog).toHaveLength(5); // 3 CREATED + 1 CREATED (aggregated) + 1 AGGREGATED_SUM
    });
  });

  describe("Enhanced ProcessNode Transformation", () => {
    it("should create transformed tokens with formula details and input mappings", () => {
      // Create source tokens
      const inputToken1 = mockStore._createToken("Queue1", 10, 100);
      const inputToken2 = mockStore._createToken("Queue2", 5, 100);

      const sourceTokens = [inputToken1, inputToken2];
      const formula = "inputs.Queue1.value + inputs.Queue2.value * 2";
      const inputMapping = {
        Queue1: { value: 10 },
        Queue2: { value: 5 },
      };
      const resultValue = 20; // 10 + 5 * 2

      // Create transformed token
      const transformedToken = mockStore._createToken("ProcessNode1", resultValue, 200, sourceTokens);

      // Create transformation details
      const transformationDetails = createTransformationDetails(formula, inputMapping, resultValue);
      const lineageMetadata = createLineageMetadata("transformation", sourceTokens, transformedToken.id);
      const enhancedSourceTokenSummaries = createEnhancedSourceTokenSummaries(sourceTokens);

      // Log the transformation operation
      const transformationEntry = mockStore._logNodeActivity(
        "ProcessNode1",
        {
          action: "OUTPUT_GENERATED",
          value: resultValue,
          sourceTokenIds: sourceTokens.map(t => t.id),
          sourceTokenSummaries: enhancedSourceTokenSummaries,
          details: `${transformationDetails.calculation}. Token ${transformedToken.id} for output 0`,
          transformationDetails,
          lineageMetadata,
        },
        200,
      );

      // Verify the transformation log entry
      expect(transformationEntry.operationType).toBe("transformation");
      expect(transformationEntry.transformationDetails).toEqual({
        formula,
        inputMapping,
        calculation: "inputs.Queue1.value + inputs.Queue2.value * 2 = 10 + 5 * 2 = 20",
        resultValue: 20,
      });
      expect(transformationEntry.lineageMetadata).toEqual({
        generationLevel: 1,
        ultimateSources: [inputToken1.id, inputToken2.id],
        operationType: "transformation",
      });

      // Verify global activity log
      expect(mockStore.globalActivityLog).toHaveLength(4); // 2 CREATED + 1 CREATED (transformed) + 1 OUTPUT_GENERATED
    });
  });

  describe("Multi-Level Lineage Tracking", () => {
    it("should correctly track lineage through multiple processing levels", () => {
      // Level 0: DataSource tokens
      const rootToken1 = mockStore._createToken("DataSource1", 3, 100);
      const rootToken2 = mockStore._createToken("DataSource2", 7, 100);

      // Level 1: Queue aggregation
      const level1Sources = [rootToken1, rootToken2];
      const level1Token = mockStore._createToken("Queue1", 10, 200, level1Sources);

      const level1AggregationDetails = createAggregationDetails("sum", level1Sources, 10);
      const level1LineageMetadata = createLineageMetadata("aggregation", level1Sources, level1Token.id);

      mockStore._logNodeActivity(
        "Queue1",
        {
          action: "AGGREGATED_SUM",
          value: 10,
          sourceTokenIds: level1Sources.map(t => t.id),
          sourceTokenSummaries: createEnhancedSourceTokenSummaries(level1Sources),
          details: `${level1AggregationDetails.calculation}. Token ${level1Token.id}`,
          aggregationDetails: level1AggregationDetails,
          lineageMetadata: level1LineageMetadata,
        },
        200,
      );

      // Level 2: ProcessNode transformation
      const level2Sources = [level1Token];
      const level2Token = mockStore._createToken("ProcessNode1", 15, 300, level2Sources);

      const transformationDetails = createTransformationDetails(
        "inputs.Queue1.value + 5",
        { Queue1: { value: 10 } },
        15,
      );
      const level2LineageMetadata = createLineageMetadata("transformation", level2Sources, level2Token.id);

      mockStore._logNodeActivity(
        "ProcessNode1",
        {
          action: "OUTPUT_GENERATED",
          value: 15,
          sourceTokenIds: level2Sources.map(t => t.id),
          sourceTokenSummaries: createEnhancedSourceTokenSummaries(level2Sources),
          details: `${transformationDetails.calculation}. Token ${level2Token.id}`,
          transformationDetails,
          lineageMetadata: level2LineageMetadata,
        },
        300,
      );

      // Verify multi-level lineage
      expect(level1LineageMetadata.generationLevel).toBe(1);
      expect(level1LineageMetadata.ultimateSources).toEqual([rootToken1.id, rootToken2.id]);

      expect(level2LineageMetadata.generationLevel).toBe(2);
      expect(level2LineageMetadata.ultimateSources).toEqual([rootToken1.id, rootToken2.id]);

      // Verify global activity log contains all operations with enhanced metadata
      expect(mockStore.globalActivityLog).toHaveLength(6); // 2 root CREATED + 1 level1 CREATED + 1 AGGREGATED_SUM + 1 level2 CREATED + 1 OUTPUT_GENERATED

      const aggregationEntry = mockStore.globalActivityLog.find(entry => entry.action === "AGGREGATED_SUM");
      const transformationEntry = mockStore.globalActivityLog.find(entry => entry.action === "OUTPUT_GENERATED");

      expect(aggregationEntry?.operationType).toBe("aggregation");
      expect(aggregationEntry?.aggregationDetails).toBeDefined();
      expect(aggregationEntry?.lineageMetadata?.generationLevel).toBe(1);

      expect(transformationEntry?.operationType).toBe("transformation");
      expect(transformationEntry?.transformationDetails).toBeDefined();
      expect(transformationEntry?.lineageMetadata?.generationLevel).toBe(2);
    });
  });

  describe("Operation Type Detection", () => {
    it("should correctly determine operation types from actions", () => {
      expect(determineOperationType("CREATED")).toBe("creation");
      expect(determineOperationType("AGGREGATED_SUM")).toBe("aggregation");
      expect(determineOperationType("AGGREGATED_AVERAGE")).toBe("aggregation");
      expect(determineOperationType("OUTPUT_GENERATED")).toBe("transformation");
      expect(determineOperationType("TOKEN_CONSUMED_FOR_AGGREGATION")).toBe("consumption");
      expect(determineOperationType("CONSUMED_BY_SINK_NODE")).toBe("consumption");
      expect(determineOperationType("TOKEN_FORWARDED_FROM_OUTPUT")).toBe("transfer");
      expect(determineOperationType("TOKEN_ARRIVED_AT_NODE")).toBe("transfer");
    });
  });
});
