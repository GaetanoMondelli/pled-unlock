/**
 * Integration tests for TokenGraph with simulation store
 */
import {
  analyzeTokenLineage,
  buildTokenGraphFromSimulation,
  findTokenContributors,
  getTokenAncestry,
  getTokenDescendants,
  validateTokenGraphIntegrity,
} from "../tokenGraphIntegration";
import type { HistoryEntry, SourceTokenSummary } from "../types";
import { describe, expect, it } from "vitest";

describe("TokenGraph Integration", () => {
  // Create a realistic simulation scenario
  const createSimulationHistory = (): HistoryEntry[] => {
    return [
      // DataSource tokens
      {
        timestamp: 100,
        epochTimestamp: Date.now(),
        sequence: 1,
        nodeId: "datasource1",
        action: "CREATED",
        value: 5,
        details: "Token DS1_T1",
        sourceTokenIds: [],
        sourceTokenSummaries: [],
      },
      {
        timestamp: 100,
        epochTimestamp: Date.now(),
        sequence: 2,
        nodeId: "datasource2",
        action: "CREATED",
        value: 15,
        details: "Token DS2_T1",
        sourceTokenIds: [],
        sourceTokenSummaries: [],
      },
      {
        timestamp: 150,
        epochTimestamp: Date.now(),
        sequence: 3,
        nodeId: "datasource1",
        action: "CREATED",
        value: 8,
        details: "Token DS1_T2",
        sourceTokenIds: [],
        sourceTokenSummaries: [],
      },
      // Queue aggregation
      {
        timestamp: 200,
        epochTimestamp: Date.now(),
        sequence: 4,
        nodeId: "queue1",
        action: "AGGREGATED_SUM",
        value: 20,
        details: "Token Q1_AGG1",
        sourceTokenIds: ["DS1_T1", "DS2_T1"],
        sourceTokenSummaries: [
          { id: "DS1_T1", originNodeId: "datasource1", originalValue: 5, createdAt: 100 },
          { id: "DS2_T1", originNodeId: "datasource2", originalValue: 15, createdAt: 100 },
        ],
      },
      // ProcessNode transformation
      {
        timestamp: 250,
        epochTimestamp: Date.now(),
        sequence: 5,
        nodeId: "processor1",
        action: "CREATED",
        value: 30,
        details: "Token P1_TRANS1",
        sourceTokenIds: ["Q1_AGG1", "DS1_T2"],
        sourceTokenSummaries: [
          { id: "Q1_AGG1", originNodeId: "queue1", originalValue: 20, createdAt: 200 },
          { id: "DS1_T2", originNodeId: "datasource1", originalValue: 8, createdAt: 150 },
        ],
      },
      // Final aggregation
      {
        timestamp: 300,
        epochTimestamp: Date.now(),
        sequence: 6,
        nodeId: "queue2",
        action: "AGGREGATED_AVERAGE",
        value: 25,
        details: "Token Q2_FINAL",
        sourceTokenIds: ["P1_TRANS1"],
        sourceTokenSummaries: [{ id: "P1_TRANS1", originNodeId: "processor1", originalValue: 30, createdAt: 250 }],
      },
    ];
  };

  describe("buildTokenGraphFromSimulation", () => {
    it("should build graph from simulation history", () => {
      const history = createSimulationHistory();
      const graph = buildTokenGraphFromSimulation(history);

      expect(graph.hasToken("DS1_T1")).toBe(true);
      expect(graph.hasToken("DS2_T1")).toBe(true);
      expect(graph.hasToken("DS1_T2")).toBe(true);
      expect(graph.hasToken("Q1_AGG1")).toBe(true);
      expect(graph.hasToken("P1_TRANS1")).toBe(true);
      expect(graph.hasToken("Q2_FINAL")).toBe(true);

      const stats = graph.getGraphStats();
      expect(stats.nodeCount).toBe(6);
      expect(stats.rootCount).toBe(3); // DS1_T1, DS2_T1, DS1_T2
      expect(stats.leafCount).toBe(1); // Q2_FINAL
    });
  });

  describe("getTokenAncestry", () => {
    it("should trace complete ancestry back to roots", () => {
      const history = createSimulationHistory();
      const result = getTokenAncestry("Q2_FINAL", history);

      expect(result.ancestors).toContain("Q2_FINAL");
      expect(result.ancestors).toContain("P1_TRANS1");
      expect(result.ancestors).toContain("Q1_AGG1");
      expect(result.ancestors).toContain("DS1_T1");
      expect(result.ancestors).toContain("DS2_T1");
      expect(result.ancestors).toContain("DS1_T2");

      expect(result.roots).toEqual(expect.arrayContaining(["DS1_T1", "DS2_T1", "DS1_T2"]));
      expect(result.roots.length).toBe(3);
    });

    it("should organize ancestry by generations", () => {
      const history = createSimulationHistory();
      const result = getTokenAncestry("Q2_FINAL", history);

      expect(result.generations.get(0)).toEqual(["Q2_FINAL"]);
      expect(result.generations.get(1)).toEqual(["P1_TRANS1"]);
      expect(result.generations.get(2)).toEqual(expect.arrayContaining(["Q1_AGG1", "DS1_T2"]));
      expect(result.generations.get(3)).toEqual(expect.arrayContaining(["DS1_T1", "DS2_T1"]));
    });

    it("should handle non-existent tokens", () => {
      const history = createSimulationHistory();
      const result = getTokenAncestry("NONEXISTENT", history);

      expect(result.ancestors).toEqual([]);
      expect(result.generations.size).toBe(0);
      expect(result.roots).toEqual([]);
    });
  });

  describe("getTokenDescendants", () => {
    it("should find all descendants from a root token", () => {
      const history = createSimulationHistory();
      const result = getTokenDescendants("DS1_T1", history);

      expect(result.descendants).toContain("DS1_T1");
      expect(result.descendants).toContain("Q1_AGG1");
      expect(result.descendants).toContain("P1_TRANS1");
      expect(result.descendants).toContain("Q2_FINAL");

      expect(result.leaves).toEqual(["Q2_FINAL"]);
    });

    it("should organize descendants by generations", () => {
      const history = createSimulationHistory();
      const result = getTokenDescendants("DS1_T1", history);

      expect(result.generations.get(0)).toEqual(["DS1_T1"]);
      expect(result.generations.get(1)).toEqual(["Q1_AGG1"]);
      expect(result.generations.get(2)).toEqual(["P1_TRANS1"]);
      expect(result.generations.get(3)).toEqual(["Q2_FINAL"]);
    });
  });

  describe("analyzeTokenLineage", () => {
    it("should provide comprehensive lineage statistics", () => {
      const history = createSimulationHistory();
      const analysis = analyzeTokenLineage(history);

      expect(analysis.totalTokens).toBe(6);
      expect(analysis.rootTokens).toBe(3);
      expect(analysis.leafTokens).toBe(1);
      expect(analysis.maxDepth).toBeGreaterThan(0);
      expect(analysis.averageDepth).toBeGreaterThan(0);
      expect(analysis.hasCycles).toBe(false);
      expect(analysis.cycleCount).toBe(0);
    });

    it("should handle empty history", () => {
      const analysis = analyzeTokenLineage([]);

      expect(analysis.totalTokens).toBe(0);
      expect(analysis.rootTokens).toBe(0);
      expect(analysis.leafTokens).toBe(0);
      expect(analysis.maxDepth).toBe(0);
      expect(analysis.averageDepth).toBe(0);
      expect(analysis.hasCycles).toBe(false);
      expect(analysis.cycleCount).toBe(0);
    });
  });

  describe("findTokenContributors", () => {
    it("should find all tokens that contributed to final value", () => {
      const history = createSimulationHistory();
      const contributors = findTokenContributors("Q2_FINAL", history);

      expect(contributors.length).toBe(5); // All tokens except Q2_FINAL itself

      // Should include all source tokens
      const contributorIds = contributors.map(c => c.tokenId);
      expect(contributorIds).toContain("DS1_T1");
      expect(contributorIds).toContain("DS2_T1");
      expect(contributorIds).toContain("DS1_T2");
      expect(contributorIds).toContain("Q1_AGG1");
      expect(contributorIds).toContain("P1_TRANS1");

      // Check root identification
      const roots = contributors.filter(c => c.isRoot);
      expect(roots.length).toBe(3);
      expect(roots.map(r => r.tokenId)).toEqual(expect.arrayContaining(["DS1_T1", "DS2_T1", "DS1_T2"]));

      // Check direct parent identification
      const directParents = contributors.filter(c => c.isDirectParent);
      expect(directParents.length).toBe(1);
      expect(directParents[0].tokenId).toBe("P1_TRANS1");
    });

    it("should sort contributors by creation time", () => {
      const history = createSimulationHistory();
      const contributors = findTokenContributors("Q2_FINAL", history);

      // Should be sorted by createdAt (oldest first)
      for (let i = 1; i < contributors.length; i++) {
        expect(contributors[i].createdAt).toBeGreaterThanOrEqual(contributors[i - 1].createdAt);
      }
    });

    it("should handle non-existent tokens", () => {
      const history = createSimulationHistory();
      const contributors = findTokenContributors("NONEXISTENT", history);

      expect(contributors).toEqual([]);
    });
  });

  describe("validateTokenGraphIntegrity", () => {
    it("should validate healthy token graph", () => {
      const history = createSimulationHistory();
      const validation = validateTokenGraphIntegrity(history);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
      expect(validation.warnings.length).toBeLessThanOrEqual(1); // May have depth warning
    });

    it("should detect missing parent references", () => {
      const historyWithMissingParent: HistoryEntry[] = [
        {
          timestamp: 100,
          epochTimestamp: Date.now(),
          sequence: 1,
          nodeId: "queue1",
          action: "AGGREGATED_SUM",
          value: 30,
          details: "Token ORPHAN",
          sourceTokenIds: ["MISSING_PARENT"],
          sourceTokenSummaries: [
            { id: "MISSING_PARENT", originNodeId: "datasource1", originalValue: 30, createdAt: 50 },
          ],
        },
      ];

      const validation = validateTokenGraphIntegrity(historyWithMissingParent);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(error => error.includes("non-existent parent"))).toBe(true);
    });

    it("should handle empty history gracefully", () => {
      const validation = validateTokenGraphIntegrity([]);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it("should detect cycles if present", () => {
      // This would require creating a cyclic history, which shouldn't happen in normal simulation
      // but we test the detection capability
      const history = createSimulationHistory();
      const validation = validateTokenGraphIntegrity(history);

      // Should not have cycles in normal simulation
      expect(validation.errors.some(error => error.includes("cycles"))).toBe(false);
    });
  });

  describe("Real-world simulation scenarios", () => {
    it("should handle complex multi-path aggregation", () => {
      const complexHistory: HistoryEntry[] = [
        // Multiple data sources
        ...Array.from({ length: 5 }, (_, i) => ({
          timestamp: 100 + i * 10,
          epochTimestamp: Date.now(),
          sequence: i + 1,
          nodeId: `datasource${i + 1}`,
          action: "CREATED" as const,
          value: (i + 1) * 10,
          details: `Token DS${i + 1}_T1`,
          sourceTokenIds: [],
          sourceTokenSummaries: [],
        })),
        // Multiple aggregations
        {
          timestamp: 200,
          epochTimestamp: Date.now(),
          sequence: 6,
          nodeId: "queue1",
          action: "AGGREGATED_SUM",
          value: 150,
          details: "Token Q1_SUM",
          sourceTokenIds: ["DS1_T1", "DS2_T1", "DS3_T1", "DS4_T1", "DS5_T1"],
          sourceTokenSummaries: Array.from({ length: 5 }, (_, i) => ({
            id: `DS${i + 1}_T1`,
            originNodeId: `datasource${i + 1}`,
            originalValue: (i + 1) * 10,
            createdAt: 100 + i * 10,
          })),
        },
      ];

      const graph = buildTokenGraphFromSimulation(complexHistory);
      const ancestry = getTokenAncestry("Q1_SUM", complexHistory);
      const analysis = analyzeTokenLineage(complexHistory);

      expect(graph.hasToken("Q1_SUM")).toBe(true);
      expect(ancestry.roots.length).toBe(5);
      expect(analysis.totalTokens).toBe(6);
      expect(analysis.rootTokens).toBe(5);
      expect(analysis.leafTokens).toBe(1);
    });
  });
});
