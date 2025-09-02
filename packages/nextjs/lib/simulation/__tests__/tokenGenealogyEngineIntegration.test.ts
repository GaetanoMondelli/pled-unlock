/**
 * Integration tests for TokenGenealogyEngine with complex real-world scenarios
 *
 * These tests demonstrate the complete functionality of the TokenGenealogyEngine
 * with multi-level aggregations, transformations, and complex lineage scenarios.
 */
import {
  TokenGenealogyEngine,
  buildTokenLineage,
  findSourceContributions,
  validateTokenLineage,
} from "../tokenGenealogyEngine";
import type { HistoryEntry, SourceTokenSummary } from "../types";
import { describe, expect, it } from "vitest";

describe("TokenGenealogyEngine Integration Tests", () => {
  /**
   * Create a comprehensive simulation scenario that demonstrates:
   * - Multiple data sources
   * - Multi-level aggregations (sum, average, count)
   * - ProcessNode transformations
   * - Diamond pattern convergence
   * - Complex lineage tracing
   */
  const createComprehensiveSimulationHistory = (): HistoryEntry[] => {
    return [
      // === PHASE 1: Data Sources (5 sources) ===
      {
        timestamp: 100,
        epochTimestamp: Date.now(),
        sequence: 1,
        nodeId: "sensor_temperature",
        action: "CREATED",
        value: 25.5,
        details: "Token TEMP_001",
        sourceTokenIds: [],
        sourceTokenSummaries: [],
      },
      {
        timestamp: 100,
        epochTimestamp: Date.now(),
        sequence: 2,
        nodeId: "sensor_humidity",
        action: "CREATED",
        value: 60.2,
        details: "Token HUMID_001",
        sourceTokenIds: [],
        sourceTokenSummaries: [],
      },
      {
        timestamp: 110,
        epochTimestamp: Date.now(),
        sequence: 3,
        nodeId: "sensor_pressure",
        action: "CREATED",
        value: 1013.25,
        details: "Token PRESS_001",
        sourceTokenIds: [],
        sourceTokenSummaries: [],
      },
      {
        timestamp: 120,
        epochTimestamp: Date.now(),
        sequence: 4,
        nodeId: "sensor_temperature",
        action: "CREATED",
        value: 26.1,
        details: "Token TEMP_002",
        sourceTokenIds: [],
        sourceTokenSummaries: [],
      },
      {
        timestamp: 130,
        epochTimestamp: Date.now(),
        sequence: 5,
        nodeId: "sensor_humidity",
        action: "CREATED",
        value: 58.7,
        details: "Token HUMID_002",
        sourceTokenIds: [],
        sourceTokenSummaries: [],
      },

      // === PHASE 2: First Level Aggregations ===
      // Temperature average
      {
        timestamp: 200,
        epochTimestamp: Date.now(),
        sequence: 6,
        nodeId: "temp_aggregator",
        action: "AGGREGATED_AVERAGE",
        value: 25.8, // (25.5 + 26.1) / 2
        details: "Token TEMP_AVG",
        sourceTokenIds: ["TEMP_001", "TEMP_002"],
        sourceTokenSummaries: [
          { id: "TEMP_001", originNodeId: "sensor_temperature", originalValue: 25.5, createdAt: 100 },
          { id: "TEMP_002", originNodeId: "sensor_temperature", originalValue: 26.1, createdAt: 120 },
        ],
      },
      // Humidity average
      {
        timestamp: 200,
        epochTimestamp: Date.now(),
        sequence: 7,
        nodeId: "humid_aggregator",
        action: "AGGREGATED_AVERAGE",
        value: 59.45, // (60.2 + 58.7) / 2
        details: "Token HUMID_AVG",
        sourceTokenIds: ["HUMID_001", "HUMID_002"],
        sourceTokenSummaries: [
          { id: "HUMID_001", originNodeId: "sensor_humidity", originalValue: 60.2, createdAt: 100 },
          { id: "HUMID_002", originNodeId: "sensor_humidity", originalValue: 58.7, createdAt: 130 },
        ],
      },

      // === PHASE 3: ProcessNode Transformations ===
      // Comfort index calculation: (temp * 0.7) + (humidity * 0.3)
      {
        timestamp: 300,
        epochTimestamp: Date.now(),
        sequence: 8,
        nodeId: "comfort_processor",
        action: "CREATED",
        value: 35.895, // (25.8 * 0.7) + (59.45 * 0.3) = 18.06 + 17.835
        details: "Token COMFORT_INDEX",
        sourceTokenIds: ["TEMP_AVG", "HUMID_AVG"],
        sourceTokenSummaries: [
          { id: "TEMP_AVG", originNodeId: "temp_aggregator", originalValue: 25.8, createdAt: 200 },
          { id: "HUMID_AVG", originNodeId: "humid_aggregator", originalValue: 59.45, createdAt: 200 },
        ],
      },
      // Weather severity: pressure deviation from standard (1013.25)
      {
        timestamp: 300,
        epochTimestamp: Date.now(),
        sequence: 9,
        nodeId: "weather_processor",
        action: "CREATED",
        value: 0, // abs(1013.25 - 1013.25) = 0
        details: "Token WEATHER_SEVERITY",
        sourceTokenIds: ["PRESS_001"],
        sourceTokenSummaries: [
          { id: "PRESS_001", originNodeId: "sensor_pressure", originalValue: 1013.25, createdAt: 110 },
        ],
      },

      // === PHASE 4: Diamond Pattern Convergence ===
      // Environmental risk assessment using both comfort and weather
      {
        timestamp: 400,
        epochTimestamp: Date.now(),
        sequence: 10,
        nodeId: "risk_assessor",
        action: "AGGREGATED_SUM",
        value: 35.895, // COMFORT_INDEX + WEATHER_SEVERITY = 35.895 + 0
        details: "Token RISK_SCORE",
        sourceTokenIds: ["COMFORT_INDEX", "WEATHER_SEVERITY"],
        sourceTokenSummaries: [
          { id: "COMFORT_INDEX", originNodeId: "comfort_processor", originalValue: 35.895, createdAt: 300 },
          { id: "WEATHER_SEVERITY", originNodeId: "weather_processor", originalValue: 0, createdAt: 300 },
        ],
      },

      // === PHASE 5: Final Analysis ===
      // Overall environmental status (count of contributing factors)
      {
        timestamp: 500,
        epochTimestamp: Date.now(),
        sequence: 11,
        nodeId: "status_analyzer",
        action: "AGGREGATED_COUNT",
        value: 1, // Count of RISK_SCORE
        details: "Token ENV_STATUS",
        sourceTokenIds: ["RISK_SCORE"],
        sourceTokenSummaries: [
          { id: "RISK_SCORE", originNodeId: "risk_assessor", originalValue: 35.895, createdAt: 400 },
        ],
      },
    ];
  };

  describe("Complete Lineage Reconstruction", () => {
    it("should trace complete lineage from final token to all data sources", () => {
      const history = createComprehensiveSimulationHistory();
      const engine = new TokenGenealogyEngine(history);

      const lineage = engine.buildCompleteLineage("ENV_STATUS");

      // Verify target token
      expect(lineage.targetToken.id).toBe("ENV_STATUS");
      expect(lineage.targetToken.value).toBe(1);

      // Should have all ancestors in the chain
      const ancestorIds = lineage.allAncestors.map(a => a.id);
      expect(ancestorIds).toContain("ENV_STATUS");
      expect(ancestorIds).toContain("RISK_SCORE");
      expect(ancestorIds).toContain("COMFORT_INDEX");
      expect(ancestorIds).toContain("WEATHER_SEVERITY");
      expect(ancestorIds).toContain("TEMP_AVG");
      expect(ancestorIds).toContain("HUMID_AVG");
      expect(ancestorIds).toContain("PRESS_001");
      expect(ancestorIds).toContain("TEMP_001");
      expect(ancestorIds).toContain("TEMP_002");
      expect(ancestorIds).toContain("HUMID_001");
      expect(ancestorIds).toContain("HUMID_002");

      // Should identify all root tokens (data sources)
      const rootAncestors = lineage.allAncestors.filter(a => a.isRoot);
      expect(rootAncestors).toHaveLength(5);
      const rootIds = rootAncestors.map(r => r.id).sort();
      expect(rootIds).toEqual(["HUMID_001", "HUMID_002", "PRESS_001", "TEMP_001", "TEMP_002"]);

      // Should have correct source contributions
      expect(lineage.sourceContributions).toHaveLength(5);
      const contributionIds = lineage.sourceContributions.map(c => c.sourceTokenId).sort();
      expect(contributionIds).toEqual(["HUMID_001", "HUMID_002", "PRESS_001", "TEMP_001", "TEMP_002"]);

      // Should have proper generation levels
      expect(lineage.generationLevels.length).toBeGreaterThan(3);
      expect(lineage.generationLevels[0].tokens[0].id).toBe("ENV_STATUS");
    });

    it("should handle diamond pattern lineage correctly", () => {
      const history = createComprehensiveSimulationHistory();
      const engine = new TokenGenealogyEngine(history);

      const lineage = engine.buildCompleteLineage("RISK_SCORE");

      // Should trace back through both comfort and weather paths
      const ancestorIds = lineage.allAncestors.map(a => a.id);
      expect(ancestorIds).toContain("COMFORT_INDEX");
      expect(ancestorIds).toContain("WEATHER_SEVERITY");
      expect(ancestorIds).toContain("TEMP_AVG");
      expect(ancestorIds).toContain("HUMID_AVG");
      expect(ancestorIds).toContain("PRESS_001");

      // Should identify all ultimate sources
      const rootAncestors = lineage.allAncestors.filter(a => a.isRoot);
      expect(rootAncestors).toHaveLength(5);

      // Should have contributions from all sources
      expect(lineage.sourceContributions).toHaveLength(5);
    });

    it("should reconstruct operation details correctly", () => {
      const history = createComprehensiveSimulationHistory();
      const engine = new TokenGenealogyEngine(history);

      // Test aggregation operation details
      const tempAvgOperation = engine.buildOperationDetails("TEMP_AVG");
      expect(tempAvgOperation).toBeDefined();
      expect(tempAvgOperation!.type).toBe("aggregation");
      expect(tempAvgOperation!.method).toBe("average");
      expect(tempAvgOperation!.sourceTokens).toHaveLength(2);
      expect(tempAvgOperation!.aggregationDetails?.calculation).toContain("avg(25.5, 26.1)");

      // Test transformation operation details
      const comfortOperation = engine.buildOperationDetails("COMFORT_INDEX");
      expect(comfortOperation).toBeDefined();
      expect(comfortOperation!.type).toBe("transformation");
      expect(comfortOperation!.sourceTokens).toHaveLength(2);

      // Test datasource operation details
      const tempOperation = engine.buildOperationDetails("TEMP_001");
      expect(tempOperation).toBeDefined();
      expect(tempOperation!.type).toBe("datasource_creation");
      expect(tempOperation!.sourceTokens).toHaveLength(0);
    });
  });

  describe("Source Contribution Analysis", () => {
    it("should calculate proportional contributions correctly", () => {
      const history = createComprehensiveSimulationHistory();
      const contributions = findSourceContributions("ENV_STATUS", history);

      expect(contributions).toHaveLength(5);

      // All contributions should be positive
      for (const contribution of contributions) {
        expect(contribution.proportionalContribution).toBeGreaterThan(0);
        expect(contribution.proportionalContribution).toBeLessThanOrEqual(1);
        expect(contribution.contributionPath).toContain(contribution.sourceTokenId);
        expect(contribution.contributionPath).toContain("ENV_STATUS");
      }

      // Should include all sensor data
      const sourceIds = contributions.map(c => c.sourceTokenId).sort();
      expect(sourceIds).toEqual(["HUMID_001", "HUMID_002", "PRESS_001", "TEMP_001", "TEMP_002"]);
    });

    it("should trace contribution paths correctly", () => {
      const history = createComprehensiveSimulationHistory();
      const contributions = findSourceContributions("COMFORT_INDEX", history);

      expect(contributions).toHaveLength(4); // TEMP_001, TEMP_002, HUMID_001, HUMID_002

      // Check that temperature sensor contributions go through TEMP_AVG
      const tempContributions = contributions.filter(c => c.sourceTokenId.startsWith("TEMP_"));
      for (const tempContrib of tempContributions) {
        expect(tempContrib.contributionPath).toContain("TEMP_AVG");
        expect(tempContrib.contributionPath).toContain("COMFORT_INDEX");
      }

      // Check that humidity sensor contributions go through HUMID_AVG
      const humidContributions = contributions.filter(c => c.sourceTokenId.startsWith("HUMID_"));
      for (const humidContrib of humidContributions) {
        expect(humidContrib.contributionPath).toContain("HUMID_AVG");
        expect(humidContrib.contributionPath).toContain("COMFORT_INDEX");
      }
    });
  });

  describe("Complex Aggregation Scenarios", () => {
    it("should handle multiple aggregation methods in sequence", () => {
      const history = createComprehensiveSimulationHistory();
      const lineage = buildTokenLineage("ENV_STATUS", history);

      // Should have different operation types in the lineage
      const operations = lineage.allAncestors.map(a => a.operation?.type).filter(type => type !== undefined);

      expect(operations).toContain("datasource_creation");
      expect(operations).toContain("aggregation");
      expect(operations).toContain("transformation");

      // Should have different aggregation methods
      const aggregationMethods = lineage.allAncestors
        .map(a => a.operation?.method)
        .filter(method => method !== undefined);

      expect(aggregationMethods).toContain("average");
      expect(aggregationMethods).toContain("sum");
      expect(aggregationMethods).toContain("count");
    });

    it("should maintain operation calculation details", () => {
      const history = createComprehensiveSimulationHistory();
      const engine = new TokenGenealogyEngine(history);

      // Check temperature average calculation
      const tempAvgOperation = engine.buildOperationDetails("TEMP_AVG");
      expect(tempAvgOperation?.aggregationDetails?.calculation).toMatch(/avg\(25\.5, 26\.1\)/);
      expect(tempAvgOperation?.aggregationDetails?.resultValue).toBe(25.8);

      // Check humidity average calculation
      const humidAvgOperation = engine.buildOperationDetails("HUMID_AVG");
      expect(humidAvgOperation?.aggregationDetails?.calculation).toMatch(/avg\(60\.2, 58\.7\)/);
      expect(humidAvgOperation?.aggregationDetails?.resultValue).toBe(59.45);

      // Check risk score sum calculation
      const riskOperation = engine.buildOperationDetails("RISK_SCORE");
      expect(riskOperation?.aggregationDetails?.calculation).toMatch(/sum\(35\.895, 0\)/);
      expect(riskOperation?.aggregationDetails?.resultValue).toBe(35.895);
    });
  });

  describe("Performance and Validation", () => {
    it("should validate complex lineage without errors", () => {
      const history = createComprehensiveSimulationHistory();
      const validation = validateTokenLineage("ENV_STATUS", history);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // May have warnings about depth, but should be valid
      if (validation.warnings.length > 0) {
        expect(validation.warnings.every(w => w.includes("deep lineage"))).toBe(true);
      }
    });

    it("should handle lineage computation efficiently", () => {
      const history = createComprehensiveSimulationHistory();

      const start = Date.now();
      const lineage = buildTokenLineage("ENV_STATUS", history);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(lineage.allAncestors.length).toBeGreaterThan(5);
      expect(lineage.sourceContributions.length).toBe(5);
    });

    it("should provide comprehensive generation analysis", () => {
      const history = createComprehensiveSimulationHistory();
      const lineage = buildTokenLineage("ENV_STATUS", history);

      expect(lineage.generationLevels.length).toBeGreaterThan(3);

      // Generation 0 should be the target token
      expect(lineage.generationLevels[0].level).toBe(0);
      expect(lineage.generationLevels[0].tokens[0].id).toBe("ENV_STATUS");

      // Last generation should contain only root tokens
      const lastGeneration = lineage.generationLevels[lineage.generationLevels.length - 1];
      const lastGenerationTokens = lastGeneration.tokens;
      expect(lastGenerationTokens.every(t => t.isRoot)).toBe(true);

      // All root tokens should be present across all generations (may be at different levels due to diamond pattern)
      const allRootTokensInGenerations = lineage.generationLevels.flatMap(gen => gen.tokens).filter(t => t.isRoot);
      expect(allRootTokensInGenerations).toHaveLength(5);
    });
  });

  describe("Error Handling in Complex Scenarios", () => {
    it("should handle missing intermediate tokens gracefully", () => {
      const incompleteHistory = createComprehensiveSimulationHistory();

      // Remove one of the intermediate aggregation tokens
      const filteredHistory = incompleteHistory.filter(entry => !entry.details?.includes("TEMP_AVG"));

      const validation = validateTokenLineage("ENV_STATUS", filteredHistory);

      // Should detect the missing token in the lineage
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(e => e.type === "incomplete_lineage")).toBe(true);
    });

    it("should detect and report circular references", () => {
      const cyclicHistory = [
        {
          timestamp: 100,
          epochTimestamp: Date.now(),
          sequence: 1,
          nodeId: "node1",
          action: "CREATED",
          value: 10,
          details: "Token A",
          sourceTokenIds: ["B"],
          sourceTokenSummaries: [{ id: "B", originNodeId: "node2", originalValue: 5, createdAt: 50 }],
        },
        {
          timestamp: 200,
          epochTimestamp: Date.now(),
          sequence: 2,
          nodeId: "node2",
          action: "CREATED",
          value: 5,
          details: "Token B",
          sourceTokenIds: ["A"],
          sourceTokenSummaries: [{ id: "A", originNodeId: "node1", originalValue: 10, createdAt: 100 }],
        },
      ];

      const validation = validateTokenLineage("A", cyclicHistory);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.type === "circular_reference")).toBe(true);
    });
  });

  describe("Real-world Integration Scenarios", () => {
    it("should handle IoT sensor data aggregation pipeline", () => {
      // This test demonstrates a realistic IoT data processing pipeline
      const history = createComprehensiveSimulationHistory();
      const engine = new TokenGenealogyEngine(history);

      // Trace the complete pipeline from sensors to final analysis
      const lineage = engine.buildCompleteLineage("ENV_STATUS");

      // Verify the complete data flow
      expect(lineage.allAncestors.some(a => a.originNodeId === "sensor_temperature")).toBe(true);
      expect(lineage.allAncestors.some(a => a.originNodeId === "sensor_humidity")).toBe(true);
      expect(lineage.allAncestors.some(a => a.originNodeId === "sensor_pressure")).toBe(true);
      expect(lineage.allAncestors.some(a => a.originNodeId === "temp_aggregator")).toBe(true);
      expect(lineage.allAncestors.some(a => a.originNodeId === "humid_aggregator")).toBe(true);
      expect(lineage.allAncestors.some(a => a.originNodeId === "comfort_processor")).toBe(true);
      expect(lineage.allAncestors.some(a => a.originNodeId === "weather_processor")).toBe(true);
      expect(lineage.allAncestors.some(a => a.originNodeId === "risk_assessor")).toBe(true);
      expect(lineage.allAncestors.some(a => a.originNodeId === "status_analyzer")).toBe(true);

      // Verify data quality and completeness
      expect(lineage.sourceContributions).toHaveLength(5);
      expect(lineage.generationLevels.length).toBeGreaterThan(4);

      // Verify operation reconstruction
      const operations = lineage.allAncestors.map(a => a.operation).filter(op => op !== undefined);

      expect(operations.some(op => op!.type === "datasource_creation")).toBe(true);
      expect(operations.some(op => op!.type === "aggregation" && op!.method === "average")).toBe(true);
      expect(operations.some(op => op!.type === "aggregation" && op!.method === "sum")).toBe(true);
      expect(operations.some(op => op!.type === "aggregation" && op!.method === "count")).toBe(true);
      expect(operations.some(op => op!.type === "transformation")).toBe(true);
    });
  });
});
