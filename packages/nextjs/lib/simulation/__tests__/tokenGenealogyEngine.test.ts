/**
 * Comprehensive unit tests for TokenGenealogyEngine
 *
 * Tests complex lineage scenarios including multi-level aggregations,
 * transformations, source contribution calculations, and error handling.
 */
import {
  type AncestorToken,
  type LineageError,
  type SourceContribution,
  TokenGenealogyEngine,
  type TokenLineage,
  buildTokenLineage,
  createTokenGenealogyEngine,
  findSourceContributions,
  validateTokenLineage,
} from "../tokenGenealogyEngine";
import type { HistoryEntry, SourceTokenSummary } from "../types";
import { beforeEach, describe, expect, it } from "vitest";

describe("TokenGenealogyEngine", () => {
  let engine: TokenGenealogyEngine;

  // Helper function to create a realistic simulation history
  const createComplexSimulationHistory = (): HistoryEntry[] => {
    return [
      // DataSource tokens (roots)
      {
        timestamp: 100,
        epochTimestamp: Date.now(),
        sequence: 1,
        nodeId: "datasource1",
        action: "CREATED",
        value: 5,
        details: "Token ROOT1",
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
        details: "Token ROOT2",
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
        details: "Token ROOT3",
        sourceTokenIds: [],
        sourceTokenSummaries: [],
      },
      // First level aggregation
      {
        timestamp: 200,
        epochTimestamp: Date.now(),
        sequence: 4,
        nodeId: "queue1",
        action: "AGGREGATED_SUM",
        value: 20,
        details: "Token AGG1",
        sourceTokenIds: ["ROOT1", "ROOT2"],
        sourceTokenSummaries: [
          { id: "ROOT1", originNodeId: "datasource1", originalValue: 5, createdAt: 100 },
          { id: "ROOT2", originNodeId: "datasource2", originalValue: 15, createdAt: 100 },
        ],
      },
      // ProcessNode transformation
      {
        timestamp: 250,
        epochTimestamp: Date.now(),
        sequence: 5,
        nodeId: "processor1",
        action: "CREATED",
        value: 28,
        details: "Token TRANS1",
        sourceTokenIds: ["AGG1", "ROOT3"],
        sourceTokenSummaries: [
          { id: "AGG1", originNodeId: "queue1", originalValue: 20, createdAt: 200 },
          { id: "ROOT3", originNodeId: "datasource1", originalValue: 8, createdAt: 150 },
        ],
      },
      // Second level aggregation (average)
      {
        timestamp: 300,
        epochTimestamp: Date.now(),
        sequence: 6,
        nodeId: "queue2",
        action: "AGGREGATED_AVERAGE",
        value: 14,
        details: "Token FINAL",
        sourceTokenIds: ["TRANS1"],
        sourceTokenSummaries: [{ id: "TRANS1", originNodeId: "processor1", originalValue: 28, createdAt: 250 }],
      },
    ];
  };

  beforeEach(() => {
    const history = createComplexSimulationHistory();
    engine = new TokenGenealogyEngine(history);
  });

  describe("Constructor and Initialization", () => {
    it("should initialize with history and build internal maps", () => {
      const history = createComplexSimulationHistory();
      const newEngine = new TokenGenealogyEngine(history);

      const stats = newEngine.getGraphStats();
      expect(stats.nodeCount).toBe(6); // ROOT1, ROOT2, ROOT3, AGG1, TRANS1, FINAL
      expect(stats.rootCount).toBe(3); // ROOT1, ROOT2, ROOT3
      expect(stats.leafCount).toBe(1); // FINAL
    });

    it("should handle empty history gracefully", () => {
      const emptyEngine = new TokenGenealogyEngine([]);
      const stats = emptyEngine.getGraphStats();

      expect(stats.nodeCount).toBe(0);
      expect(stats.rootCount).toBe(0);
      expect(stats.leafCount).toBe(0);
    });
  });

  describe("buildCompleteLineage", () => {
    it("should build complete lineage for final token", () => {
      const lineage = engine.buildCompleteLineage("FINAL");

      expect(lineage.targetToken.id).toBe("FINAL");
      expect(lineage.targetToken.value).toBe(14);

      // Should have one immediate parent
      expect(lineage.immediateParents).toHaveLength(1);
      expect(lineage.immediateParents[0].id).toBe("TRANS1");

      // Should have all ancestors
      expect(lineage.allAncestors).toHaveLength(6); // FINAL, TRANS1, AGG1, ROOT1, ROOT2, ROOT3
      const ancestorIds = lineage.allAncestors.map(a => a.id);
      expect(ancestorIds).toContain("FINAL");
      expect(ancestorIds).toContain("TRANS1");
      expect(ancestorIds).toContain("AGG1");
      expect(ancestorIds).toContain("ROOT1");
      expect(ancestorIds).toContain("ROOT2");
      expect(ancestorIds).toContain("ROOT3");

      // Should identify root tokens correctly
      const rootAncestors = lineage.allAncestors.filter(a => a.isRoot);
      expect(rootAncestors).toHaveLength(3);
      expect(rootAncestors.map(r => r.id)).toEqual(expect.arrayContaining(["ROOT1", "ROOT2", "ROOT3"]));

      // Should have source contributions
      expect(lineage.sourceContributions).toHaveLength(3);
      const contributionIds = lineage.sourceContributions.map(c => c.sourceTokenId);
      expect(contributionIds).toEqual(expect.arrayContaining(["ROOT1", "ROOT2", "ROOT3"]));

      // Should have generation levels
      expect(lineage.generationLevels.length).toBeGreaterThan(0);
      expect(lineage.generationLevels[0].level).toBe(0);
      expect(lineage.generationLevels[0].tokens[0].id).toBe("FINAL");
    });

    it("should build lineage for intermediate token", () => {
      const lineage = engine.buildCompleteLineage("AGG1");

      expect(lineage.targetToken.id).toBe("AGG1");
      expect(lineage.allAncestors).toHaveLength(3); // AGG1, ROOT1, ROOT2

      const rootAncestors = lineage.allAncestors.filter(a => a.isRoot);
      expect(rootAncestors).toHaveLength(2); // ROOT1, ROOT2

      expect(lineage.sourceContributions).toHaveLength(2);
    });

    it("should build lineage for root token", () => {
      const lineage = engine.buildCompleteLineage("ROOT1");

      expect(lineage.targetToken.id).toBe("ROOT1");
      expect(lineage.allAncestors).toHaveLength(1); // Only ROOT1 itself
      expect(lineage.allAncestors[0].isRoot).toBe(true);
      expect(lineage.immediateParents).toHaveLength(0);
      expect(lineage.sourceContributions).toHaveLength(1);
      expect(lineage.sourceContributions[0].sourceTokenId).toBe("ROOT1");
    });

    it("should throw error for non-existent token", () => {
      expect(() => {
        engine.buildCompleteLineage("NONEXISTENT");
      }).toThrow();
    });
  });

  describe("findAllAncestors", () => {
    it("should find all ancestors with correct generation levels", () => {
      const ancestors = engine.findAllAncestors("FINAL");

      expect(ancestors).toHaveLength(6);

      // Check that root tokens are identified correctly
      const roots = ancestors.filter(a => a.isRoot);
      expect(roots).toHaveLength(3);
      expect(roots.map(r => r.id)).toEqual(expect.arrayContaining(["ROOT1", "ROOT2", "ROOT3"]));

      // Check that each ancestor has complete history
      for (const ancestor of ancestors) {
        expect(ancestor.completeHistory).toBeDefined();
        expect(ancestor.completeHistory.length).toBeGreaterThan(0);
        expect(ancestor.contributionPath).toContain(ancestor.id);
      }
    });

    it("should handle cycle detection", () => {
      // Create a history with potential cycle (though this shouldn't happen in normal simulation)
      const cyclicHistory: HistoryEntry[] = [
        {
          timestamp: 100,
          epochTimestamp: Date.now(),
          sequence: 1,
          nodeId: "node1",
          action: "CREATED",
          value: 10,
          details: "Token A",
          sourceTokenIds: ["B"], // A depends on B
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
          sourceTokenIds: ["A"], // B depends on A - creates cycle
          sourceTokenSummaries: [{ id: "A", originNodeId: "node1", originalValue: 10, createdAt: 100 }],
        },
      ];

      const cyclicEngine = new TokenGenealogyEngine(cyclicHistory);

      // Should not get stuck in infinite loop
      const ancestors = cyclicEngine.findAllAncestors("A");
      expect(ancestors.length).toBeGreaterThan(0);
      expect(ancestors.length).toBeLessThan(10); // Should terminate quickly
    });
  });

  describe("findAllDescendants", () => {
    it("should find all descendants from root token", () => {
      const descendants = engine.findAllDescendants("ROOT1");

      expect(descendants.length).toBeGreaterThan(1);
      const descendantIds = descendants.map(d => d.id);
      expect(descendantIds).toContain("ROOT1");
      expect(descendantIds).toContain("AGG1");
      expect(descendantIds).toContain("TRANS1");
      expect(descendantIds).toContain("FINAL");

      // Check derivation paths
      for (const descendant of descendants) {
        expect(descendant.derivationPath).toContain(descendant.id);
        if (descendant.id !== "ROOT1") {
          expect(descendant.derivationPath).toContain("ROOT1");
        }
      }
    });

    it("should handle leaf token (no descendants)", () => {
      const descendants = engine.findAllDescendants("FINAL");

      expect(descendants).toHaveLength(1);
      expect(descendants[0].id).toBe("FINAL");
    });
  });

  describe("calculateSourceContributions", () => {
    it("should calculate contributions from all source tokens", () => {
      const contributions = engine.calculateSourceContributions("FINAL");

      expect(contributions).toHaveLength(3); // ROOT1, ROOT2, ROOT3

      for (const contribution of contributions) {
        expect(contribution.sourceTokenId).toMatch(/^ROOT[123]$/);
        expect(contribution.proportionalContribution).toBeGreaterThan(0);
        expect(contribution.proportionalContribution).toBeLessThanOrEqual(1);
        expect(contribution.contributionPath).toContain(contribution.sourceTokenId);
        expect(contribution.contributionPath).toContain("FINAL");
      }
    });

    it("should calculate contributions for intermediate token", () => {
      const contributions = engine.calculateSourceContributions("AGG1");

      expect(contributions).toHaveLength(2); // ROOT1, ROOT2

      const contributionIds = contributions.map(c => c.sourceTokenId);
      expect(contributionIds).toEqual(expect.arrayContaining(["ROOT1", "ROOT2"]));
    });

    it("should handle root token contributions", () => {
      const contributions = engine.calculateSourceContributions("ROOT1");

      expect(contributions).toHaveLength(1);
      expect(contributions[0].sourceTokenId).toBe("ROOT1");
      expect(contributions[0].proportionalContribution).toBe(1.0);
    });
  });

  describe("buildOperationDetails", () => {
    it("should build operation details for aggregation", () => {
      const operation = engine.buildOperationDetails("AGG1");

      expect(operation).toBeDefined();
      expect(operation!.type).toBe("aggregation");
      expect(operation!.method).toBe("sum");
      expect(operation!.sourceTokens).toHaveLength(2);

      const sourceIds = operation!.sourceTokens.map(s => s.tokenId);
      expect(sourceIds).toEqual(expect.arrayContaining(["ROOT1", "ROOT2"]));
    });

    it("should build operation details for transformation", () => {
      const operation = engine.buildOperationDetails("TRANS1");

      expect(operation).toBeDefined();
      expect(operation!.type).toBe("transformation");
      expect(operation!.sourceTokens).toHaveLength(2);

      const sourceIds = operation!.sourceTokens.map(s => s.tokenId);
      expect(sourceIds).toEqual(expect.arrayContaining(["AGG1", "ROOT3"]));
    });

    it("should build operation details for datasource creation", () => {
      const operation = engine.buildOperationDetails("ROOT1");

      expect(operation).toBeDefined();
      expect(operation!.type).toBe("datasource_creation");
      expect(operation!.sourceTokens).toHaveLength(0);
    });

    it("should return undefined for non-existent token", () => {
      const operation = engine.buildOperationDetails("NONEXISTENT");
      expect(operation).toBeUndefined();
    });
  });

  describe("isRootToken", () => {
    it("should identify root tokens correctly", () => {
      expect(engine.isRootToken("ROOT1")).toBe(true);
      expect(engine.isRootToken("ROOT2")).toBe(true);
      expect(engine.isRootToken("ROOT3")).toBe(true);

      expect(engine.isRootToken("AGG1")).toBe(false);
      expect(engine.isRootToken("TRANS1")).toBe(false);
      expect(engine.isRootToken("FINAL")).toBe(false);
    });

    it("should return false for non-existent tokens", () => {
      expect(engine.isRootToken("NONEXISTENT")).toBe(false);
    });
  });

  describe("validateLineage", () => {
    it("should validate healthy lineage", () => {
      const validation = engine.validateLineage("FINAL");

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings.length).toBeLessThanOrEqual(1); // May have depth warning
    });

    it("should detect missing token", () => {
      const validation = engine.validateLineage("NONEXISTENT");

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].type).toBe("missing_token");
      expect(validation.errors[0].tokenId).toBe("NONEXISTENT");
    });

    it("should detect very deep lineage", () => {
      // Create a very deep lineage chain
      const deepHistory: HistoryEntry[] = [];

      // Create root
      deepHistory.push({
        timestamp: 100,
        epochTimestamp: Date.now(),
        sequence: 1,
        nodeId: "datasource1",
        action: "CREATED",
        value: 1,
        details: "Token ROOT",
        sourceTokenIds: [],
        sourceTokenSummaries: [],
      });

      // Create 25 levels of transformations
      for (let i = 1; i <= 25; i++) {
        const prevToken = i === 1 ? "ROOT" : `LEVEL${i - 1}`;
        deepHistory.push({
          timestamp: 100 + i * 10,
          epochTimestamp: Date.now(),
          sequence: i + 1,
          nodeId: `processor${i}`,
          action: "CREATED",
          value: i + 1,
          details: `Token LEVEL${i}`,
          sourceTokenIds: [prevToken],
          sourceTokenSummaries: [
            {
              id: prevToken,
              originNodeId: i === 1 ? "datasource1" : `processor${i - 1}`,
              originalValue: i,
              createdAt: 100 + (i - 1) * 10,
            },
          ],
        });
      }

      const deepEngine = new TokenGenealogyEngine(deepHistory);
      const validation = deepEngine.validateLineage("LEVEL25");

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.includes("deep lineage"))).toBe(true);
    });
  });

  describe("refresh", () => {
    it("should refresh with new history", () => {
      const newHistory: HistoryEntry[] = [
        {
          timestamp: 100,
          epochTimestamp: Date.now(),
          sequence: 1,
          nodeId: "datasource1",
          action: "CREATED",
          value: 42,
          details: "Token NEWTOKEN",
          sourceTokenIds: [],
          sourceTokenSummaries: [],
        },
      ];

      engine.refresh(newHistory);

      const stats = engine.getGraphStats();
      expect(stats.nodeCount).toBe(1);

      const lineage = engine.buildCompleteLineage("NEWTOKEN");
      expect(lineage.targetToken.id).toBe("NEWTOKEN");
      expect(lineage.targetToken.value).toBe(42);
    });

    it("should refresh with existing history", () => {
      const originalStats = engine.getGraphStats();

      engine.refresh(); // No new history provided

      const newStats = engine.getGraphStats();
      expect(newStats.nodeCount).toBe(originalStats.nodeCount);
    });
  });

  describe("Complex Multi-Level Scenarios", () => {
    it("should handle diamond pattern aggregation", () => {
      const diamondHistory: HistoryEntry[] = [
        // Root
        {
          timestamp: 100,
          epochTimestamp: Date.now(),
          sequence: 1,
          nodeId: "datasource1",
          action: "CREATED",
          value: 10,
          details: "Token ROOT",
          sourceTokenIds: [],
          sourceTokenSummaries: [],
        },
        // Two parallel aggregations
        {
          timestamp: 200,
          epochTimestamp: Date.now(),
          sequence: 2,
          nodeId: "queue1",
          action: "AGGREGATED_SUM",
          value: 10,
          details: "Token LEFT",
          sourceTokenIds: ["ROOT"],
          sourceTokenSummaries: [{ id: "ROOT", originNodeId: "datasource1", originalValue: 10, createdAt: 100 }],
        },
        {
          timestamp: 200,
          epochTimestamp: Date.now(),
          sequence: 3,
          nodeId: "queue2",
          action: "AGGREGATED_AVERAGE",
          value: 10,
          details: "Token RIGHT",
          sourceTokenIds: ["ROOT"],
          sourceTokenSummaries: [{ id: "ROOT", originNodeId: "datasource1", originalValue: 10, createdAt: 100 }],
        },
        // Final convergence
        {
          timestamp: 300,
          epochTimestamp: Date.now(),
          sequence: 4,
          nodeId: "processor1",
          action: "CREATED",
          value: 20,
          details: "Token FINAL",
          sourceTokenIds: ["LEFT", "RIGHT"],
          sourceTokenSummaries: [
            { id: "LEFT", originNodeId: "queue1", originalValue: 10, createdAt: 200 },
            { id: "RIGHT", originNodeId: "queue2", originalValue: 10, createdAt: 200 },
          ],
        },
      ];

      const diamondEngine = new TokenGenealogyEngine(diamondHistory);
      const lineage = diamondEngine.buildCompleteLineage("FINAL");

      expect(lineage.allAncestors).toHaveLength(4); // FINAL, LEFT, RIGHT, ROOT
      expect(lineage.immediateParents).toHaveLength(2); // LEFT, RIGHT
      expect(lineage.sourceContributions).toHaveLength(1); // Only ROOT
      expect(lineage.sourceContributions[0].sourceTokenId).toBe("ROOT");

      // Should have multiple paths to the same root
      const rootAncestor = lineage.allAncestors.find(a => a.id === "ROOT");
      expect(rootAncestor).toBeDefined();
      expect(rootAncestor!.isRoot).toBe(true);
    });

    it("should handle multiple data sources with complex aggregations", () => {
      const multiSourceHistory: HistoryEntry[] = [
        // Multiple roots
        ...Array.from({ length: 5 }, (_, i) => ({
          timestamp: 100 + i * 10,
          epochTimestamp: Date.now(),
          sequence: i + 1,
          nodeId: `datasource${i + 1}`,
          action: "CREATED" as const,
          value: (i + 1) * 5,
          details: `Token ROOT${i + 1}`,
          sourceTokenIds: [],
          sourceTokenSummaries: [],
        })),
        // First level aggregations
        {
          timestamp: 200,
          epochTimestamp: Date.now(),
          sequence: 6,
          nodeId: "queue1",
          action: "AGGREGATED_SUM",
          value: 40,
          details: "Token AGG1",
          sourceTokenIds: ["ROOT1", "ROOT2", "ROOT3"],
          sourceTokenSummaries: [
            { id: "ROOT1", originNodeId: "datasource1", originalValue: 5, createdAt: 100 },
            { id: "ROOT2", originNodeId: "datasource2", originalValue: 10, createdAt: 110 },
            { id: "ROOT3", originNodeId: "datasource3", originalValue: 15, createdAt: 120 },
          ],
        },
        {
          timestamp: 200,
          epochTimestamp: Date.now(),
          sequence: 7,
          nodeId: "queue2",
          action: "AGGREGATED_AVERAGE",
          value: 22.5,
          details: "Token AGG2",
          sourceTokenIds: ["ROOT4", "ROOT5"],
          sourceTokenSummaries: [
            { id: "ROOT4", originNodeId: "datasource4", originalValue: 20, createdAt: 130 },
            { id: "ROOT5", originNodeId: "datasource5", originalValue: 25, createdAt: 140 },
          ],
        },
        // Final aggregation
        {
          timestamp: 300,
          epochTimestamp: Date.now(),
          sequence: 8,
          nodeId: "queue3",
          action: "AGGREGATED_COUNT",
          value: 2,
          details: "Token FINAL",
          sourceTokenIds: ["AGG1", "AGG2"],
          sourceTokenSummaries: [
            { id: "AGG1", originNodeId: "queue1", originalValue: 40, createdAt: 200 },
            { id: "AGG2", originNodeId: "queue2", originalValue: 22.5, createdAt: 200 },
          ],
        },
      ];

      const multiEngine = new TokenGenealogyEngine(multiSourceHistory);
      const lineage = multiEngine.buildCompleteLineage("FINAL");

      expect(lineage.allAncestors).toHaveLength(8); // FINAL + AGG1 + AGG2 + 5 ROOTs
      expect(lineage.sourceContributions).toHaveLength(5); // 5 root tokens

      const rootContributions = lineage.sourceContributions.map(c => c.sourceTokenId).sort();
      expect(rootContributions).toEqual(["ROOT1", "ROOT2", "ROOT3", "ROOT4", "ROOT5"]);

      // Check generation levels
      expect(lineage.generationLevels).toHaveLength(3);
      expect(lineage.generationLevels[0].tokens[0].id).toBe("FINAL");
      expect(lineage.generationLevels[1].tokens.map(t => t.id)).toEqual(expect.arrayContaining(["AGG1", "AGG2"]));
      expect(lineage.generationLevels[2].tokens.map(t => t.id)).toEqual(
        expect.arrayContaining(["ROOT1", "ROOT2", "ROOT3", "ROOT4", "ROOT5"]),
      );
    });
  });
});

describe("Utility Functions", () => {
  const simpleHistory: HistoryEntry[] = [
    {
      timestamp: 100,
      epochTimestamp: Date.now(),
      sequence: 1,
      nodeId: "datasource1",
      action: "CREATED",
      value: 42,
      details: "Token SIMPLE",
      sourceTokenIds: [],
      sourceTokenSummaries: [],
    },
  ];

  describe("createTokenGenealogyEngine", () => {
    it("should create engine from history", () => {
      const engine = createTokenGenealogyEngine(simpleHistory);
      expect(engine).toBeInstanceOf(TokenGenealogyEngine);

      const stats = engine.getGraphStats();
      expect(stats.nodeCount).toBe(1);
    });
  });

  describe("buildTokenLineage", () => {
    it("should build lineage directly from history", () => {
      const lineage = buildTokenLineage("SIMPLE", simpleHistory);

      expect(lineage.targetToken.id).toBe("SIMPLE");
      expect(lineage.allAncestors).toHaveLength(1);
      expect(lineage.allAncestors[0].isRoot).toBe(true);
    });
  });

  describe("findSourceContributions", () => {
    it("should find contributions directly from history", () => {
      const contributions = findSourceContributions("SIMPLE", simpleHistory);

      expect(contributions).toHaveLength(1);
      expect(contributions[0].sourceTokenId).toBe("SIMPLE");
      expect(contributions[0].proportionalContribution).toBe(1.0);
    });
  });

  describe("validateTokenLineage", () => {
    it("should validate lineage directly from history", () => {
      const validation = validateTokenLineage("SIMPLE", simpleHistory);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should detect invalid token", () => {
      const validation = validateTokenLineage("NONEXISTENT", simpleHistory);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].type).toBe("missing_token");
    });
  });
});

describe("Error Handling and Edge Cases", () => {
  describe("Malformed History Entries", () => {
    it("should handle entries without token details", () => {
      const malformedHistory: HistoryEntry[] = [
        {
          timestamp: 100,
          epochTimestamp: Date.now(),
          sequence: 1,
          nodeId: "datasource1",
          action: "CREATED",
          value: 42,
          details: "No token pattern here", // Missing "Token {id}" pattern
          sourceTokenIds: [],
          sourceTokenSummaries: [],
        },
      ];

      const engine = new TokenGenealogyEngine(malformedHistory);
      const stats = engine.getGraphStats();
      expect(stats.nodeCount).toBe(0);
    });

    it("should handle missing source token summaries", () => {
      const incompleteHistory: HistoryEntry[] = [
        {
          timestamp: 100,
          epochTimestamp: Date.now(),
          sequence: 1,
          nodeId: "datasource1",
          action: "CREATED",
          value: 10,
          details: "Token ROOT",
          sourceTokenIds: [],
          sourceTokenSummaries: [],
        },
        {
          timestamp: 200,
          epochTimestamp: Date.now(),
          sequence: 2,
          nodeId: "queue1",
          action: "AGGREGATED_SUM",
          value: 10,
          details: "Token AGG",
          sourceTokenIds: ["ROOT"],
          sourceTokenSummaries: [], // Missing summaries
        },
      ];

      const engine = new TokenGenealogyEngine(incompleteHistory);
      const lineage = engine.buildCompleteLineage("AGG");

      expect(lineage.targetToken.id).toBe("AGG");
      expect(lineage.allAncestors).toHaveLength(2); // AGG and ROOT
    });
  });

  describe("Performance Edge Cases", () => {
    it("should handle large number of tokens efficiently", () => {
      const largeHistory: HistoryEntry[] = [];

      // Create 100 root tokens
      for (let i = 0; i < 100; i++) {
        largeHistory.push({
          timestamp: 100 + i,
          epochTimestamp: Date.now(),
          sequence: i + 1,
          nodeId: `datasource${i}`,
          action: "CREATED",
          value: i,
          details: `Token ROOT${i}`,
          sourceTokenIds: [],
          sourceTokenSummaries: [],
        });
      }

      // Create one massive aggregation
      largeHistory.push({
        timestamp: 1000,
        epochTimestamp: Date.now(),
        sequence: 101,
        nodeId: "megaqueue",
        action: "AGGREGATED_SUM",
        value: 4950, // Sum of 0 to 99
        details: "Token MEGA",
        sourceTokenIds: Array.from({ length: 100 }, (_, i) => `ROOT${i}`),
        sourceTokenSummaries: Array.from({ length: 100 }, (_, i) => ({
          id: `ROOT${i}`,
          originNodeId: `datasource${i}`,
          originalValue: i,
          createdAt: 100 + i,
        })),
      });

      const engine = new TokenGenealogyEngine(largeHistory);
      const lineage = engine.buildCompleteLineage("MEGA");

      expect(lineage.allAncestors).toHaveLength(101); // MEGA + 100 roots
      expect(lineage.sourceContributions).toHaveLength(100);

      // Should complete in reasonable time
      const start = Date.now();
      engine.validateLineage("MEGA");
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
