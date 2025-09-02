/**
 * Comprehensive unit tests for TokenGraph data structures and algorithms
 */
import {
  type OperationInfo,
  type TokenEdge,
  TokenGraph,
  type TokenNode,
  buildTokenGraphFromHistory,
  isRootToken,
} from "../tokenGraph";
import type { HistoryEntry, SourceTokenSummary } from "../types";
import { beforeEach, describe, expect, it } from "vitest";

describe("TokenGraph", () => {
  let graph: TokenGraph;

  beforeEach(() => {
    graph = new TokenGraph();
  });

  describe("Basic Graph Operations", () => {
    it("should add and retrieve nodes", () => {
      const node: TokenNode = {
        tokenId: "token1",
        value: 42,
        createdAt: 100,
        originNodeId: "source1",
        operation: {
          type: "datasource_creation",
          sourceTokens: [],
        },
      };

      graph.addNode(node);

      expect(graph.hasToken("token1")).toBe(true);
      expect(graph.getNode("token1")).toEqual(node);
      expect(graph.hasToken("nonexistent")).toBe(false);
    });

    it("should add and retrieve edges", () => {
      // Create nodes
      const sourceNode: TokenNode = {
        tokenId: "source",
        value: 10,
        createdAt: 100,
        originNodeId: "datasource1",
        operation: { type: "datasource_creation", sourceTokens: [] },
      };

      const targetNode: TokenNode = {
        tokenId: "target",
        value: 20,
        createdAt: 200,
        originNodeId: "queue1",
        operation: { type: "aggregation", sourceTokens: [] },
      };

      graph.addNode(sourceNode);
      graph.addNode(targetNode);

      // Create edge
      const edge: TokenEdge = {
        fromTokenId: "source",
        toTokenId: "target",
        operation: targetNode.operation!,
        weight: 1.0,
      };

      graph.addEdge(edge);

      expect(graph.getOutgoingEdges("source")).toEqual([edge]);
      expect(graph.getIncomingEdges("target")).toEqual([edge]);
      expect(graph.getParents("target")).toEqual(["source"]);
      expect(graph.getChildren("source")).toEqual(["target"]);
    });
  });

  describe("DFS Ancestry Traversal", () => {
    beforeEach(() => {
      // Create a simple chain: root -> intermediate -> leaf
      const rootNode: TokenNode = {
        tokenId: "root",
        value: 5,
        createdAt: 100,
        originNodeId: "datasource1",
        operation: { type: "datasource_creation", sourceTokens: [] },
      };

      const intermediateNode: TokenNode = {
        tokenId: "intermediate",
        value: 15,
        createdAt: 200,
        originNodeId: "queue1",
        operation: { type: "aggregation", sourceTokens: [] },
      };

      const leafNode: TokenNode = {
        tokenId: "leaf",
        value: 25,
        createdAt: 300,
        originNodeId: "processor1",
        operation: { type: "transformation", sourceTokens: [] },
      };

      graph.addNode(rootNode);
      graph.addNode(intermediateNode);
      graph.addNode(leafNode);

      graph.addEdge({
        fromTokenId: "root",
        toTokenId: "intermediate",
        operation: intermediateNode.operation!,
        weight: 1.0,
      });

      graph.addEdge({
        fromTokenId: "intermediate",
        toTokenId: "leaf",
        operation: leafNode.operation!,
        weight: 1.0,
      });
    });

    it("should perform DFS ancestry traversal correctly", () => {
      const result = graph.dfsAncestryTraversal("leaf");
      expect(result).toEqual(["leaf", "intermediate", "root"]);
    });

    it("should handle single node traversal", () => {
      const result = graph.dfsAncestryTraversal("root");
      expect(result).toEqual(["root"]);
    });

    it("should handle nonexistent token", () => {
      const result = graph.dfsAncestryTraversal("nonexistent");
      expect(result).toEqual([]);
    });

    it("should detect and handle cycles in ancestry traversal", () => {
      // Create a cycle: A -> B -> C -> A
      const nodeA: TokenNode = {
        tokenId: "A",
        value: 1,
        createdAt: 100,
        originNodeId: "node1",
        operation: { type: "transformation", sourceTokens: [] },
      };

      const nodeB: TokenNode = {
        tokenId: "B",
        value: 2,
        createdAt: 200,
        originNodeId: "node2",
        operation: { type: "transformation", sourceTokens: [] },
      };

      const nodeC: TokenNode = {
        tokenId: "C",
        value: 3,
        createdAt: 300,
        originNodeId: "node3",
        operation: { type: "transformation", sourceTokens: [] },
      };

      const cycleGraph = new TokenGraph();
      cycleGraph.addNode(nodeA);
      cycleGraph.addNode(nodeB);
      cycleGraph.addNode(nodeC);

      // Create cycle: A <- B <- C <- A
      cycleGraph.addEdge({
        fromTokenId: "B",
        toTokenId: "A",
        operation: nodeA.operation!,
        weight: 1.0,
      });

      cycleGraph.addEdge({
        fromTokenId: "C",
        toTokenId: "B",
        operation: nodeB.operation!,
        weight: 1.0,
      });

      cycleGraph.addEdge({
        fromTokenId: "A",
        toTokenId: "C",
        operation: nodeC.operation!,
        weight: 1.0,
      });

      // Should not get stuck in infinite loop
      const result = cycleGraph.dfsAncestryTraversal("A");
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThan(10); // Should terminate quickly
    });
  });

  describe("DFS Descendant Traversal", () => {
    beforeEach(() => {
      // Create a tree: root -> [child1, child2] -> grandchild
      const rootNode: TokenNode = {
        tokenId: "root",
        value: 10,
        createdAt: 100,
        originNodeId: "datasource1",
        operation: { type: "datasource_creation", sourceTokens: [] },
      };

      const child1Node: TokenNode = {
        tokenId: "child1",
        value: 20,
        createdAt: 200,
        originNodeId: "queue1",
        operation: { type: "aggregation", sourceTokens: [] },
      };

      const child2Node: TokenNode = {
        tokenId: "child2",
        value: 30,
        createdAt: 250,
        originNodeId: "queue2",
        operation: { type: "aggregation", sourceTokens: [] },
      };

      const grandchildNode: TokenNode = {
        tokenId: "grandchild",
        value: 50,
        createdAt: 300,
        originNodeId: "processor1",
        operation: { type: "transformation", sourceTokens: [] },
      };

      graph.addNode(rootNode);
      graph.addNode(child1Node);
      graph.addNode(child2Node);
      graph.addNode(grandchildNode);

      graph.addEdge({
        fromTokenId: "root",
        toTokenId: "child1",
        operation: child1Node.operation!,
        weight: 1.0,
      });

      graph.addEdge({
        fromTokenId: "root",
        toTokenId: "child2",
        operation: child2Node.operation!,
        weight: 1.0,
      });

      graph.addEdge({
        fromTokenId: "child1",
        toTokenId: "grandchild",
        operation: grandchildNode.operation!,
        weight: 0.5,
      });

      graph.addEdge({
        fromTokenId: "child2",
        toTokenId: "grandchild",
        operation: grandchildNode.operation!,
        weight: 0.5,
      });
    });

    it("should perform DFS descendant traversal correctly", () => {
      const result = graph.dfsDescendantTraversal("root");
      expect(result).toContain("root");
      expect(result).toContain("child1");
      expect(result).toContain("child2");
      expect(result).toContain("grandchild");
      expect(result[0]).toBe("root"); // Root should be first
    });

    it("should handle leaf node traversal", () => {
      const result = graph.dfsDescendantTraversal("grandchild");
      expect(result).toEqual(["grandchild"]);
    });
  });

  describe("BFS Generation Analysis", () => {
    beforeEach(() => {
      // Create multi-level ancestry: leaf -> gen1 -> gen2 -> [root1, root2]
      const leaf: TokenNode = {
        tokenId: "leaf",
        value: 100,
        createdAt: 400,
        originNodeId: "sink1",
        operation: { type: "transformation", sourceTokens: [] },
      };

      const gen1: TokenNode = {
        tokenId: "gen1",
        value: 50,
        createdAt: 300,
        originNodeId: "processor1",
        operation: { type: "transformation", sourceTokens: [] },
      };

      const gen2a: TokenNode = {
        tokenId: "gen2a",
        value: 25,
        createdAt: 200,
        originNodeId: "queue1",
        operation: { type: "aggregation", sourceTokens: [] },
      };

      const gen2b: TokenNode = {
        tokenId: "gen2b",
        value: 25,
        createdAt: 200,
        originNodeId: "queue2",
        operation: { type: "aggregation", sourceTokens: [] },
      };

      const root1: TokenNode = {
        tokenId: "root1",
        value: 10,
        createdAt: 100,
        originNodeId: "datasource1",
        operation: { type: "datasource_creation", sourceTokens: [] },
      };

      const root2: TokenNode = {
        tokenId: "root2",
        value: 15,
        createdAt: 100,
        originNodeId: "datasource2",
        operation: { type: "datasource_creation", sourceTokens: [] },
      };

      [leaf, gen1, gen2a, gen2b, root1, root2].forEach(node => graph.addNode(node));

      // Create ancestry edges (backwards)
      graph.addEdge({ fromTokenId: "gen1", toTokenId: "leaf", operation: leaf.operation!, weight: 1.0 });
      graph.addEdge({ fromTokenId: "gen2a", toTokenId: "gen1", operation: gen1.operation!, weight: 0.5 });
      graph.addEdge({ fromTokenId: "gen2b", toTokenId: "gen1", operation: gen1.operation!, weight: 0.5 });
      graph.addEdge({ fromTokenId: "root1", toTokenId: "gen2a", operation: gen2a.operation!, weight: 1.0 });
      graph.addEdge({ fromTokenId: "root2", toTokenId: "gen2b", operation: gen2b.operation!, weight: 1.0 });
    });

    it("should perform BFS ancestry by generation correctly", () => {
      const result = graph.bfsAncestryByGeneration("leaf");

      expect(result.get(0)).toEqual(["leaf"]);
      expect(result.get(1)).toEqual(["gen1"]);
      expect(result.get(2)).toEqual(expect.arrayContaining(["gen2a", "gen2b"]));
      expect(result.get(3)).toEqual(expect.arrayContaining(["root1", "root2"]));
    });

    it("should handle root token generation analysis", () => {
      const result = graph.bfsAncestryByGeneration("root1");
      expect(result.get(0)).toEqual(["root1"]);
      expect(result.size).toBe(1);
    });
  });

  describe("Root Token Detection", () => {
    beforeEach(() => {
      const rootToken: TokenNode = {
        tokenId: "root",
        value: 42,
        createdAt: 100,
        originNodeId: "datasource1",
        operation: { type: "datasource_creation", sourceTokens: [] },
      };

      const derivedToken: TokenNode = {
        tokenId: "derived",
        value: 84,
        createdAt: 200,
        originNodeId: "queue1",
        operation: { type: "aggregation", sourceTokens: [] },
      };

      graph.addNode(rootToken);
      graph.addNode(derivedToken);

      graph.addEdge({
        fromTokenId: "root",
        toTokenId: "derived",
        operation: derivedToken.operation!,
        weight: 1.0,
      });
    });

    it("should identify root tokens correctly", () => {
      const roots = graph.findRootTokens();
      expect(roots).toEqual(["root"]);
    });

    it("should identify leaf tokens correctly", () => {
      const leaves = graph.findLeafTokens();
      expect(leaves).toEqual(["derived"]);
    });

    it("should validate root token using utility function", () => {
      expect(isRootToken("root", graph)).toBe(true);
      expect(isRootToken("derived", graph)).toBe(false);
      expect(isRootToken("nonexistent", graph)).toBe(false);
    });
  });

  describe("Cycle Detection", () => {
    it("should detect cycles in the graph", () => {
      // Create a cycle: A -> B -> C -> A
      const nodeA: TokenNode = {
        tokenId: "A",
        value: 1,
        createdAt: 100,
        originNodeId: "node1",
        operation: { type: "transformation", sourceTokens: [] },
      };

      const nodeB: TokenNode = {
        tokenId: "B",
        value: 2,
        createdAt: 200,
        originNodeId: "node2",
        operation: { type: "transformation", sourceTokens: [] },
      };

      const nodeC: TokenNode = {
        tokenId: "C",
        value: 3,
        createdAt: 300,
        originNodeId: "node3",
        operation: { type: "transformation", sourceTokens: [] },
      };

      graph.addNode(nodeA);
      graph.addNode(nodeB);
      graph.addNode(nodeC);

      graph.addEdge({
        fromTokenId: "A",
        toTokenId: "B",
        operation: nodeB.operation!,
        weight: 1.0,
      });

      graph.addEdge({
        fromTokenId: "B",
        toTokenId: "C",
        operation: nodeC.operation!,
        weight: 1.0,
      });

      graph.addEdge({
        fromTokenId: "C",
        toTokenId: "A",
        operation: nodeA.operation!,
        weight: 1.0,
      });

      const cycles = graph.detectCycles();
      expect(cycles.length).toBeGreaterThan(0);

      // Should find the cycle A -> B -> C -> A
      const cycle = cycles[0];
      expect(cycle).toContain("A");
      expect(cycle).toContain("B");
      expect(cycle).toContain("C");
    });

    it("should return empty array for acyclic graph", () => {
      const nodeA: TokenNode = {
        tokenId: "A",
        value: 1,
        createdAt: 100,
        originNodeId: "node1",
        operation: { type: "datasource_creation", sourceTokens: [] },
      };

      const nodeB: TokenNode = {
        tokenId: "B",
        value: 2,
        createdAt: 200,
        originNodeId: "node2",
        operation: { type: "transformation", sourceTokens: [] },
      };

      graph.addNode(nodeA);
      graph.addNode(nodeB);

      graph.addEdge({
        fromTokenId: "A",
        toTokenId: "B",
        operation: nodeB.operation!,
        weight: 1.0,
      });

      const cycles = graph.detectCycles();
      expect(cycles).toEqual([]);
    });
  });

  describe("Path Finding", () => {
    beforeEach(() => {
      // Create a diamond pattern: A -> [B, C] -> D
      const nodeA: TokenNode = {
        tokenId: "A",
        value: 10,
        createdAt: 100,
        originNodeId: "datasource1",
        operation: { type: "datasource_creation", sourceTokens: [] },
      };

      const nodeB: TokenNode = {
        tokenId: "B",
        value: 20,
        createdAt: 200,
        originNodeId: "queue1",
        operation: { type: "aggregation", sourceTokens: [] },
      };

      const nodeC: TokenNode = {
        tokenId: "C",
        value: 30,
        createdAt: 200,
        originNodeId: "queue2",
        operation: { type: "aggregation", sourceTokens: [] },
      };

      const nodeD: TokenNode = {
        tokenId: "D",
        value: 50,
        createdAt: 300,
        originNodeId: "processor1",
        operation: { type: "transformation", sourceTokens: [] },
      };

      [nodeA, nodeB, nodeC, nodeD].forEach(node => graph.addNode(node));

      graph.addEdge({ fromTokenId: "A", toTokenId: "B", operation: nodeB.operation!, weight: 1.0 });
      graph.addEdge({ fromTokenId: "A", toTokenId: "C", operation: nodeC.operation!, weight: 1.0 });
      graph.addEdge({ fromTokenId: "B", toTokenId: "D", operation: nodeD.operation!, weight: 0.5 });
      graph.addEdge({ fromTokenId: "C", toTokenId: "D", operation: nodeD.operation!, weight: 0.5 });
    });

    it("should find all paths between tokens", () => {
      const paths = graph.findAllPaths("A", "D");
      expect(paths.length).toBe(2); // A->B->D and A->C->D

      const pathTokens = paths.map(p => p.tokens);
      expect(pathTokens).toContainEqual(["A", "B", "D"]);
      expect(pathTokens).toContainEqual(["A", "C", "D"]);
    });

    it("should return empty array for non-connected tokens", () => {
      const isolatedNode: TokenNode = {
        tokenId: "isolated",
        value: 99,
        createdAt: 400,
        originNodeId: "isolated",
        operation: { type: "datasource_creation", sourceTokens: [] },
      };

      graph.addNode(isolatedNode);

      const paths = graph.findAllPaths("A", "isolated");
      expect(paths).toEqual([]);
    });
  });

  describe("Graph Statistics", () => {
    beforeEach(() => {
      // Create a simple graph with known properties
      const root1: TokenNode = {
        tokenId: "root1",
        value: 10,
        createdAt: 100,
        originNodeId: "datasource1",
        operation: { type: "datasource_creation", sourceTokens: [] },
      };

      const root2: TokenNode = {
        tokenId: "root2",
        value: 20,
        createdAt: 100,
        originNodeId: "datasource2",
        operation: { type: "datasource_creation", sourceTokens: [] },
      };

      const intermediate: TokenNode = {
        tokenId: "intermediate",
        value: 30,
        createdAt: 200,
        originNodeId: "queue1",
        operation: { type: "aggregation", sourceTokens: [] },
      };

      const leaf: TokenNode = {
        tokenId: "leaf",
        value: 60,
        createdAt: 300,
        originNodeId: "processor1",
        operation: { type: "transformation", sourceTokens: [] },
      };

      [root1, root2, intermediate, leaf].forEach(node => graph.addNode(node));

      graph.addEdge({
        fromTokenId: "root1",
        toTokenId: "intermediate",
        operation: intermediate.operation!,
        weight: 0.5,
      });
      graph.addEdge({
        fromTokenId: "root2",
        toTokenId: "intermediate",
        operation: intermediate.operation!,
        weight: 0.5,
      });
      graph.addEdge({ fromTokenId: "intermediate", toTokenId: "leaf", operation: leaf.operation!, weight: 1.0 });
    });

    it("should calculate graph statistics correctly", () => {
      const stats = graph.getGraphStats();

      expect(stats.nodeCount).toBe(4);
      expect(stats.edgeCount).toBe(3);
      expect(stats.rootCount).toBe(2);
      expect(stats.leafCount).toBe(1);
      expect(stats.maxDepth).toBe(2); // root -> intermediate -> leaf
      expect(stats.hasCycles).toBe(false);
    });
  });
});

describe("buildTokenGraphFromHistory", () => {
  it("should build graph from simple DataSource creation", () => {
    const historyEntries: HistoryEntry[] = [
      {
        timestamp: 100,
        epochTimestamp: Date.now(),
        sequence: 1,
        nodeId: "datasource1",
        action: "CREATED",
        value: 42,
        details: "Token ABC123",
        sourceTokenIds: [],
        sourceTokenSummaries: [],
      },
    ];

    const graph = buildTokenGraphFromHistory(historyEntries);

    expect(graph.hasToken("ABC123")).toBe(true);
    const node = graph.getNode("ABC123");
    expect(node?.value).toBe(42);
    expect(node?.operation?.type).toBe("datasource_creation");
    expect(graph.findRootTokens()).toEqual(["ABC123"]);
  });

  it("should build graph from aggregation operation", () => {
    const sourceTokenSummaries: SourceTokenSummary[] = [
      { id: "token1", originNodeId: "datasource1", originalValue: 10, createdAt: 100 },
      { id: "token2", originNodeId: "datasource2", originalValue: 20, createdAt: 100 },
    ];

    const historyEntries: HistoryEntry[] = [
      {
        timestamp: 100,
        epochTimestamp: Date.now(),
        sequence: 1,
        nodeId: "datasource1",
        action: "CREATED",
        value: 10,
        details: "Token token1",
        sourceTokenIds: [],
        sourceTokenSummaries: [],
      },
      {
        timestamp: 100,
        epochTimestamp: Date.now(),
        sequence: 2,
        nodeId: "datasource2",
        action: "CREATED",
        value: 20,
        details: "Token token2",
        sourceTokenIds: [],
        sourceTokenSummaries: [],
      },
      {
        timestamp: 200,
        epochTimestamp: Date.now(),
        sequence: 3,
        nodeId: "queue1",
        action: "AGGREGATED_SUM",
        value: 30,
        details: "Token AGG123",
        sourceTokenIds: ["token1", "token2"],
        sourceTokenSummaries,
      },
    ];

    const graph = buildTokenGraphFromHistory(historyEntries);

    expect(graph.hasToken("AGG123")).toBe(true);
    expect(graph.hasToken("token1")).toBe(true);
    expect(graph.hasToken("token2")).toBe(true);

    const aggNode = graph.getNode("AGG123");
    expect(aggNode?.operation?.type).toBe("aggregation");
    expect(aggNode?.operation?.method).toBe("sum");
    expect(aggNode?.operation?.aggregationDetails?.calculation).toContain("sum(10, 20)");

    // Check edges
    expect(graph.getParents("AGG123")).toEqual(expect.arrayContaining(["token1", "token2"]));
    expect(graph.getChildren("token1")).toEqual(["AGG123"]);
    expect(graph.getChildren("token2")).toEqual(["AGG123"]);
  });

  it("should handle complex multi-level lineage", () => {
    const historyEntries: HistoryEntry[] = [
      // Root tokens
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
      // Aggregation
      {
        timestamp: 200,
        epochTimestamp: Date.now(),
        sequence: 3,
        nodeId: "queue1",
        action: "AGGREGATED_AVERAGE",
        value: 10,
        details: "Token AGG1",
        sourceTokenIds: ["ROOT1", "ROOT2"],
        sourceTokenSummaries: [
          { id: "ROOT1", originNodeId: "datasource1", originalValue: 5, createdAt: 100 },
          { id: "ROOT2", originNodeId: "datasource2", originalValue: 15, createdAt: 100 },
        ],
      },
      // Transformation
      {
        timestamp: 300,
        epochTimestamp: Date.now(),
        sequence: 4,
        nodeId: "processor1",
        action: "CREATED",
        value: 20,
        details: "Token TRANS1",
        sourceTokenIds: ["AGG1"],
        sourceTokenSummaries: [{ id: "AGG1", originNodeId: "queue1", originalValue: 10, createdAt: 200 }],
      },
    ];

    const graph = buildTokenGraphFromHistory(historyEntries);

    // Verify all tokens exist
    expect(graph.hasToken("ROOT1")).toBe(true);
    expect(graph.hasToken("ROOT2")).toBe(true);
    expect(graph.hasToken("AGG1")).toBe(true);
    expect(graph.hasToken("TRANS1")).toBe(true);

    // Verify lineage structure
    expect(graph.findRootTokens()).toEqual(expect.arrayContaining(["ROOT1", "ROOT2"]));
    expect(graph.findLeafTokens()).toEqual(["TRANS1"]);

    // Verify ancestry traversal
    const ancestry = graph.dfsAncestryTraversal("TRANS1");
    expect(ancestry).toContain("TRANS1");
    expect(ancestry).toContain("AGG1");
    expect(ancestry).toContain("ROOT1");
    expect(ancestry).toContain("ROOT2");

    // Verify generation levels
    const generations = graph.bfsAncestryByGeneration("TRANS1");
    expect(generations.get(0)).toEqual(["TRANS1"]);
    expect(generations.get(1)).toEqual(["AGG1"]);
    expect(generations.get(2)).toEqual(expect.arrayContaining(["ROOT1", "ROOT2"]));
  });
});

describe("Edge Cases and Error Handling", () => {
  let graph: TokenGraph;

  beforeEach(() => {
    graph = new TokenGraph();
  });

  it("should handle empty graph operations gracefully", () => {
    expect(graph.getAllTokenIds()).toEqual([]);
    expect(graph.findRootTokens()).toEqual([]);
    expect(graph.findLeafTokens()).toEqual([]);
    expect(graph.dfsAncestryTraversal("nonexistent")).toEqual([]);
    expect(graph.bfsAncestryByGeneration("nonexistent").size).toBe(0);
    expect(graph.detectCycles()).toEqual([]);
  });

  it("should handle malformed history entries", () => {
    const malformedEntries: HistoryEntry[] = [
      {
        timestamp: 100,
        epochTimestamp: Date.now(),
        sequence: 1,
        nodeId: "datasource1",
        action: "CREATED",
        value: 42,
        details: "Invalid token format", // No "Token {id}" pattern
        sourceTokenIds: [],
        sourceTokenSummaries: [],
      },
    ];

    const graph = buildTokenGraphFromHistory(malformedEntries);
    expect(graph.getAllTokenIds()).toEqual([]);
  });

  it("should handle missing source tokens in history", () => {
    const historyEntries: HistoryEntry[] = [
      {
        timestamp: 200,
        epochTimestamp: Date.now(),
        sequence: 1,
        nodeId: "queue1",
        action: "AGGREGATED_SUM",
        value: 30,
        details: "Token AGG123",
        sourceTokenIds: ["missing1", "missing2"], // These tokens don't exist
        sourceTokenSummaries: [
          { id: "missing1", originNodeId: "datasource1", originalValue: 10, createdAt: 100 },
          { id: "missing2", originNodeId: "datasource2", originalValue: 20, createdAt: 100 },
        ],
      },
    ];

    const graph = buildTokenGraphFromHistory(historyEntries);

    // Should create the aggregated token but no edges to missing sources
    expect(graph.hasToken("AGG123")).toBe(true);
    expect(graph.hasToken("missing1")).toBe(false);
    expect(graph.hasToken("missing2")).toBe(false);
    expect(graph.getParents("AGG123")).toEqual([]);
  });

  it("should clear graph correctly", () => {
    const node: TokenNode = {
      tokenId: "test",
      value: 42,
      createdAt: 100,
      originNodeId: "source1",
      operation: { type: "datasource_creation", sourceTokens: [] },
    };

    graph.addNode(node);
    expect(graph.hasToken("test")).toBe(true);

    graph.clear();
    expect(graph.hasToken("test")).toBe(false);
    expect(graph.getAllTokenIds()).toEqual([]);
  });
});
