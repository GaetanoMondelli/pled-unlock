/**
 * Integration tests for enhanced lineage tracking in simulation store
 */
// Import the actual helper functions
import {
  calculateGenerationLevel,
  createAggregationDetails,
  createEnhancedSourceTokenSummaries,
  createLineageMetadata,
  createTransformationDetails,
  determineOperationType,
  extractUltimateSources,
} from "../lineageHelpers";
import type { AggregationDetails, HistoryEntry, LineageMetadata, Token, TransformationDetails } from "../types";
import { beforeEach, describe, expect, it } from "vitest";
import { create } from "zustand";

// Mock the simulation store structure for testing
interface TestSimulationState {
  globalActivityLog: HistoryEntry[];
  eventCounter: number;
  _logNodeActivity: (nodeId: string, details: any, timestamp: number) => HistoryEntry;
  _createToken: (originNodeId: string, value: any, timestamp: number, sourceTokens?: Token[]) => Token;
}

describe("Enhanced Lineage Integration", () => {
  let testStore: TestSimulationState;

  beforeEach(() => {
    // Create a minimal test store that mimics the simulation store
    testStore = {
      globalActivityLog: [],
      eventCounter: 0,
      _logNodeActivity: (nodeId: string, details: any, timestamp: number) => {
        const operationType = determineOperationType(details.action);

        const entry: HistoryEntry = {
          timestamp,
          epochTimestamp: Date.now(),
          sequence: testStore.eventCounter++,
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

        testStore.globalActivityLog.push(entry);
        return entry;
      },
      _createToken: (originNodeId: string, value: any, timestamp: number, sourceTokens: Token[] = []) => {
        const newToken: Token = {
          id: `token_${Math.random().toString(36).substr(2, 8)}`,
          value,
          createdAt: timestamp,
          originNodeId,
          history: [],
        };

        const sourceTokenIds = sourceTokens.map(t => t.id);
        const sourceTokenSummaries = createEnhancedSourceTokenSummaries(sourceTokens);
        const lineageMetadata = createLineageMetadata("creation", sourceTokens, newToken.id);

        const createLog = testStore._logNodeActivity(
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

  describe("DataSource Token Creation", () => {
    it("should create DataSource tokens with correct lineage metadata", () => {
      const token = testStore._createToken("DataSource1", 42, 100);

      expect(token.value).toBe(42);
      expect(token.originNodeId).toBe("DataSource1");
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
    });
  });

  describe("Queue Aggregation", () => {
    it("should create aggregated tokens with detailed calculation breakdown", () => {
      // Create source tokens
      const sourceToken1 = testStore._createToken("DataSource1", 5, 100);
      const sourceToken2 = testStore._createToken("DataSource2", 7, 100);
      const sourceToken3 = testStore._createToken("DataSource3", 8, 100);

      const sourceTokens = [sourceToken1, sourceToken2, sourceToken3];
      const aggregatedValue = 20; // sum

      // Create aggregated token
      const aggregatedToken = testStore._createToken("Queue1", aggregatedValue, 200, sourceTokens);

      // Create detailed aggregation breakdown
      const aggregationDetails = createAggregationDetails("sum", sourceTokens, aggregatedValue);
      const lineageMetadata = createLineageMetadata("aggregation", sourceTokens, aggregatedToken.id);
      const enhancedSourceTokenSummaries = createEnhancedSourceTokenSummaries(sourceTokens);

      // Log the aggregation operation
      testStore._logNodeActivity(
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
      const aggregationEntry = testStore.globalActivityLog.find(entry => entry.action === "AGGREGATED_SUM");

      expect(aggregationEntry).toBeDefined();
      expect(aggregationEntry!.operationType).toBe("aggregation");
      expect(aggregationEntry!.aggregationDetails).toEqual({
        method: "sum",
        inputTokens: [
          { tokenId: sourceToken1.id, value: 5, contribution: 0.25 },
          { tokenId: sourceToken2.id, value: 7, contribution: 0.35 },
          { tokenId: sourceToken3.id, value: 8, contribution: 0.4 },
        ],
        calculation: "sum(5, 7, 8) = 5 + 7 + 8 = 20",
        resultValue: 20,
      });
      expect(aggregationEntry!.lineageMetadata).toEqual({
        generationLevel: 1,
        ultimateSources: [sourceToken1.id, sourceToken2.id, sourceToken3.id],
        operationType: "aggregation",
      });
    });

    it("should create average aggregation with correct contribution calculations", () => {
      const sourceToken1 = testStore._createToken("DataSource1", 6, 100);
      const sourceToken2 = testStore._createToken("DataSource2", 9, 100);

      const sourceTokens = [sourceToken1, sourceToken2];
      const aggregatedValue = 7.5; // average

      const aggregationDetails = createAggregationDetails("average", sourceTokens, aggregatedValue);

      expect(aggregationDetails.method).toBe("average");
      expect(aggregationDetails.calculation).toBe("avg(6, 9) = (6 + 9)/2 = 15/2 = 7.5");
      expect(aggregationDetails.inputTokens[0].contribution).toBe(3); // 6/2
      expect(aggregationDetails.inputTokens[1].contribution).toBe(4.5); // 9/2
    });
  });

  describe("ProcessNode Transformation", () => {
    it("should create transformed tokens with formula details and input mappings", () => {
      // Create source tokens
      const inputToken1 = testStore._createToken("Queue1", 10, 100);
      const inputToken2 = testStore._createToken("Queue2", 5, 100);

      const sourceTokens = [inputToken1, inputToken2];
      const formula = "inputs.Queue1.value + inputs.Queue2.value * 2";
      const inputMapping = {
        Queue1: { value: 10 },
        Queue2: { value: 5 },
      };
      const resultValue = 20; // 10 + 5 * 2

      // Create transformed token
      const transformedToken = testStore._createToken("ProcessNode1", resultValue, 200, sourceTokens);

      // Create transformation details
      const transformationDetails = createTransformationDetails(formula, inputMapping, resultValue);
      const lineageMetadata = createLineageMetadata("transformation", sourceTokens, transformedToken.id);
      const enhancedSourceTokenSummaries = createEnhancedSourceTokenSummaries(sourceTokens);

      // Log the transformation operation
      testStore._logNodeActivity(
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
      const transformationEntry = testStore.globalActivityLog.find(entry => entry.action === "OUTPUT_GENERATED");

      expect(transformationEntry).toBeDefined();
      expect(transformationEntry!.operationType).toBe("transformation");
      expect(transformationEntry!.transformationDetails).toEqual({
        formula,
        inputMapping,
        calculation: "inputs.Queue1.value + inputs.Queue2.value * 2 = 10 + 5 * 2 = 20",
        resultValue: 20,
      });
      expect(transformationEntry!.lineageMetadata).toEqual({
        generationLevel: 1,
        ultimateSources: [inputToken1.id, inputToken2.id],
        operationType: "transformation",
      });
    });
  });

  describe("Multi-Level Lineage Tracking", () => {
    it("should correctly track lineage through multiple processing levels", () => {
      // Level 0: DataSource tokens
      const rootToken1 = testStore._createToken("DataSource1", 3, 100);
      const rootToken2 = testStore._createToken("DataSource2", 7, 100);

      // Level 1: Queue aggregation
      const level1Sources = [rootToken1, rootToken2];
      const level1Token = testStore._createToken("Queue1", 10, 200, level1Sources);

      const level1AggregationDetails = createAggregationDetails("sum", level1Sources, 10);
      const level1LineageMetadata = createLineageMetadata("aggregation", level1Sources, level1Token.id);

      testStore._logNodeActivity(
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
      const level2Token = testStore._createToken("ProcessNode1", 15, 300, level2Sources);

      const transformationDetails = createTransformationDetails(
        "inputs.Queue1.value + 5",
        { Queue1: { value: 10 } },
        15,
      );
      const level2LineageMetadata = createLineageMetadata("transformation", level2Sources, level2Token.id);

      testStore._logNodeActivity(
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

      // Verify enhanced source token summaries include recursive lineage
      const level2SourceSummaries = createEnhancedSourceTokenSummaries(level2Sources);
      expect(level2SourceSummaries[0]).toEqual({
        id: level1Token.id,
        originNodeId: "Queue1",
        originalValue: 10,
        createdAt: 200,
        completeLineage: [rootToken1.id, rootToken2.id],
        generationLevel: 1,
        ultimateSources: [rootToken1.id, rootToken2.id],
      });
    });
  });

  describe("Enhanced Source Token Summaries", () => {
    it("should include complete lineage information in source summaries", () => {
      // Create a chain: DataSource -> Queue -> ProcessNode
      const rootToken = testStore._createToken("DataSource1", 5, 100);

      // Add aggregation history to root token
      const aggregationEntry = testStore._logNodeActivity(
        "Queue1",
        {
          action: "AGGREGATED_FIRST",
          value: 5,
          sourceTokenIds: [rootToken.id],
          sourceTokenSummaries: createEnhancedSourceTokenSummaries([rootToken]),
          details: "Aggregation details",
          aggregationDetails: createAggregationDetails("first", [rootToken], 5),
          lineageMetadata: createLineageMetadata("aggregation", [rootToken], "queueToken1"),
        },
        200,
      );

      const queueToken = testStore._createToken("Queue1", 5, 200, [rootToken]);
      queueToken.history.push(aggregationEntry);

      // Create enhanced summaries
      const summaries = createEnhancedSourceTokenSummaries([queueToken]);

      expect(summaries[0]).toEqual({
        id: queueToken.id,
        originNodeId: "Queue1",
        originalValue: 5,
        createdAt: 200,
        completeLineage: [rootToken.id],
        generationLevel: 1,
        ultimateSources: [rootToken.id],
      });
    });
  });

  describe("Global Activity Log Integration", () => {
    it("should maintain enhanced lineage information in global activity log", () => {
      // Create a complete scenario
      const rootToken = testStore._createToken("DataSource1", 10, 100);
      const aggregatedToken = testStore._createToken("Queue1", 10, 200, [rootToken]);

      const aggregationDetails = createAggregationDetails("first", [rootToken], 10);
      const lineageMetadata = createLineageMetadata("aggregation", [rootToken], aggregatedToken.id);

      testStore._logNodeActivity(
        "Queue1",
        {
          action: "AGGREGATED_FIRST",
          value: 10,
          sourceTokenIds: [rootToken.id],
          sourceTokenSummaries: createEnhancedSourceTokenSummaries([rootToken]),
          details: `${aggregationDetails.calculation}. Token ${aggregatedToken.id}`,
          aggregationDetails,
          lineageMetadata,
        },
        200,
      );

      // Verify global activity log contains enhanced information
      const globalLog = testStore.globalActivityLog;
      expect(globalLog).toHaveLength(3); // 2 CREATED + 1 AGGREGATED_FIRST

      const aggregationEntry = globalLog.find(entry => entry.action === "AGGREGATED_FIRST");
      expect(aggregationEntry).toBeDefined();
      expect(aggregationEntry!.operationType).toBe("aggregation");
      expect(aggregationEntry!.aggregationDetails).toBeDefined();
      expect(aggregationEntry!.lineageMetadata).toBeDefined();
      expect(aggregationEntry!.sourceTokenSummaries).toHaveLength(1);
      expect(aggregationEntry!.sourceTokenSummaries![0].completeLineage).toEqual([]);
      expect(aggregationEntry!.sourceTokenSummaries![0].generationLevel).toBe(0);
      expect(aggregationEntry!.sourceTokenSummaries![0].ultimateSources).toEqual([rootToken.id]);
    });
  });
});
