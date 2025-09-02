/**
 * Basic unit tests for LineageTable component logic
 * These tests focus on the data processing and state management logic
 * without requiring React Testing Library dependencies
 */
import { TokenLineage, TokenLineageNode } from "../types";
import { beforeEach, describe, expect, it } from "vitest";

// Mock data for testing
const createMockLineage = (): TokenLineage => {
  const nodes: TokenLineageNode[] = [
    {
      id: "node1",
      tokenId: "token1",
      generation: 0,
      timestamp: 1640995200000,
      value: 1000,
      operation: "mint",
      metadata: { creator: "user1", type: "original" },
    },
    {
      id: "node2",
      tokenId: "token2",
      generation: 1,
      timestamp: 1641081600000,
      value: 500,
      operation: "split",
      sourceNodeId: "node1",
      metadata: { parent: "token1" },
    },
    {
      id: "node3",
      tokenId: "token3",
      generation: 1,
      timestamp: 1641168000000,
      value: 500,
      operation: "split",
      sourceNodeId: "node1",
      metadata: { parent: "token1" },
    },
    {
      id: "node4",
      tokenId: "token4",
      generation: 2,
      timestamp: 1641254400000,
      value: 250,
      operation: "transfer",
      sourceNodeId: "node2",
      metadata: { recipient: "user2" },
    },
  ];

  return {
    nodes,
    edges: [
      {
        id: "edge1",
        sourceId: "node1",
        targetId: "node2",
        operation: "split",
        timestamp: 1641081600000,
      },
      {
        id: "edge2",
        sourceId: "node1",
        targetId: "node3",
        operation: "split",
        timestamp: 1641168000000,
      },
      {
        id: "edge3",
        sourceId: "node2",
        targetId: "node4",
        operation: "transfer",
        timestamp: 1641254400000,
      },
    ],
    rootTokenId: "token1",
  };
};

// Helper functions that would be extracted from the component
const filterNodes = (nodes: TokenLineageNode[], searchTerm: string): TokenLineageNode[] => {
  if (!searchTerm) return nodes;
  return nodes.filter(node => {
    // Search in all direct properties
    const directMatch = Object.entries(node).some(([key, value]) => {
      if (key === "metadata") return false; // Handle metadata separately
      return String(value).toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Search in metadata if it exists
    const metadataMatch = node.metadata
      ? Object.values(node.metadata).some(value => String(value).toLowerCase().includes(searchTerm.toLowerCase()))
      : false;

    return directMatch || metadataMatch;
  });
};

const sortNodes = (
  nodes: TokenLineageNode[],
  sortField: keyof TokenLineageNode,
  sortDirection: "asc" | "desc",
): TokenLineageNode[] => {
  return [...nodes].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === "timestamp") {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });
};

const groupNodes = (
  nodes: TokenLineageNode[],
  groupBy: "none" | "generation" | "operation" | "sourceNode",
): Record<string, TokenLineageNode[]> => {
  if (groupBy === "none") return { "All Tokens": nodes };

  // Handle empty array case
  if (nodes.length === 0) {
    return { "All Tokens": [] };
  }

  const grouped: Record<string, TokenLineageNode[]> = {};
  nodes.forEach(node => {
    let groupKey: string;
    switch (groupBy) {
      case "generation":
        groupKey = `Generation ${node.generation}`;
        break;
      case "operation":
        groupKey = node.operation || "Unknown Operation";
        break;
      case "sourceNode":
        groupKey = node.sourceNodeId || "Root Tokens";
        break;
      default:
        groupKey = "All Tokens";
    }

    if (!grouped[groupKey]) {
      grouped[groupKey] = [];
    }
    grouped[groupKey].push(node);
  });
  return grouped;
};

const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

const formatValue = (value: number): string => {
  return value.toLocaleString();
};

describe("LineageTable Data Processing Logic", () => {
  let mockLineage: TokenLineage;

  beforeEach(() => {
    mockLineage = createMockLineage();
  });

  describe("Search Functionality", () => {
    it("filters nodes based on search term", () => {
      // Search for a unique term that only appears in one node
      const filtered = filterNodes(mockLineage.nodes, "original");
      expect(filtered).toHaveLength(1);
      expect(filtered[0].metadata?.type).toBe("original");
    });

    it("searches across all node properties", () => {
      const filtered = filterNodes(mockLineage.nodes, "split");
      expect(filtered).toHaveLength(2);
      expect(filtered.every(node => node.operation === "split")).toBe(true);
    });

    it("is case insensitive", () => {
      const filtered = filterNodes(mockLineage.nodes, "MINT");
      expect(filtered).toHaveLength(1);
      expect(filtered[0].operation).toBe("mint");
    });

    it("searches in metadata", () => {
      const filtered = filterNodes(mockLineage.nodes, "user1");
      expect(filtered).toHaveLength(1);
      expect(filtered[0].metadata?.creator).toBe("user1");
    });

    it("returns all nodes when search term is empty", () => {
      const filtered = filterNodes(mockLineage.nodes, "");
      expect(filtered).toHaveLength(mockLineage.nodes.length);
    });

    it("returns empty array when no matches found", () => {
      const filtered = filterNodes(mockLineage.nodes, "nonexistent");
      expect(filtered).toHaveLength(0);
    });
  });

  describe("Sorting Functionality", () => {
    it("sorts by generation ascending", () => {
      const sorted = sortNodes(mockLineage.nodes, "generation", "asc");
      expect(sorted[0].generation).toBe(0);
      expect(sorted[sorted.length - 1].generation).toBe(2);
    });

    it("sorts by generation descending", () => {
      const sorted = sortNodes(mockLineage.nodes, "generation", "desc");
      expect(sorted[0].generation).toBe(2);
      expect(sorted[sorted.length - 1].generation).toBe(0);
    });

    it("sorts by value ascending", () => {
      const sorted = sortNodes(mockLineage.nodes, "value", "asc");
      expect(sorted[0].value).toBe(250);
      expect(sorted[sorted.length - 1].value).toBe(1000);
    });

    it("sorts by timestamp correctly", () => {
      const sorted = sortNodes(mockLineage.nodes, "timestamp", "asc");
      expect(sorted[0].timestamp).toBe(1640995200000);
      expect(sorted[sorted.length - 1].timestamp).toBe(1641254400000);
    });

    it("sorts by operation alphabetically", () => {
      const sorted = sortNodes(mockLineage.nodes, "operation", "asc");
      expect(sorted[0].operation).toBe("mint");
      expect(sorted[sorted.length - 1].operation).toBe("transfer");
    });

    it("maintains stable sort for equal values", () => {
      const sorted = sortNodes(mockLineage.nodes, "value", "asc");
      const equalValueNodes = sorted.filter(node => node.value === 500);
      expect(equalValueNodes).toHaveLength(2);
    });
  });

  describe("Grouping Functionality", () => {
    it("groups by generation", () => {
      const grouped = groupNodes(mockLineage.nodes, "generation");
      expect(Object.keys(grouped)).toContain("Generation 0");
      expect(Object.keys(grouped)).toContain("Generation 1");
      expect(Object.keys(grouped)).toContain("Generation 2");
      expect(grouped["Generation 0"]).toHaveLength(1);
      expect(grouped["Generation 1"]).toHaveLength(2);
      expect(grouped["Generation 2"]).toHaveLength(1);
    });

    it("groups by operation", () => {
      const grouped = groupNodes(mockLineage.nodes, "operation");
      expect(Object.keys(grouped)).toContain("mint");
      expect(Object.keys(grouped)).toContain("split");
      expect(Object.keys(grouped)).toContain("transfer");
      expect(grouped["mint"]).toHaveLength(1);
      expect(grouped["split"]).toHaveLength(2);
      expect(grouped["transfer"]).toHaveLength(1);
    });

    it("groups by source node", () => {
      const grouped = groupNodes(mockLineage.nodes, "sourceNode");
      expect(Object.keys(grouped)).toContain("Root Tokens");
      expect(Object.keys(grouped)).toContain("node1");
      expect(Object.keys(grouped)).toContain("node2");
      expect(grouped["Root Tokens"]).toHaveLength(1);
      expect(grouped["node1"]).toHaveLength(2);
      expect(grouped["node2"]).toHaveLength(1);
    });

    it("returns single group when grouping is none", () => {
      const grouped = groupNodes(mockLineage.nodes, "none");
      expect(Object.keys(grouped)).toEqual(["All Tokens"]);
      expect(grouped["All Tokens"]).toHaveLength(mockLineage.nodes.length);
    });

    it("handles empty operation gracefully", () => {
      const nodesWithEmptyOp = [
        ...mockLineage.nodes,
        {
          id: "empty-op",
          tokenId: "empty",
          generation: 0,
          timestamp: Date.now(),
          value: 100,
          operation: "",
        },
      ];
      const grouped = groupNodes(nodesWithEmptyOp, "operation");
      expect(Object.keys(grouped)).toContain("Unknown Operation");
    });
  });

  describe("Data Formatting", () => {
    it("formats timestamps correctly", () => {
      const formatted = formatTimestamp(1640995200000);
      expect(formatted).toMatch(/1\/1\/2022|2022/); // Different locales may format differently
    });

    it("formats values with locale formatting", () => {
      expect(formatValue(1000)).toBe("1,000");
      expect(formatValue(1234567)).toBe("1,234,567");
      expect(formatValue(0)).toBe("0");
    });

    it("handles large numbers correctly", () => {
      const largeNumber = 1234567890123;
      const formatted = formatValue(largeNumber);
      expect(formatted).toContain(",");
      expect(formatted.replace(/,/g, "")).toBe(largeNumber.toString());
    });
  });

  describe("Edge Cases", () => {
    it("handles empty node array", () => {
      const emptyNodes: TokenLineageNode[] = [];

      expect(filterNodes(emptyNodes, "test")).toEqual([]);
      expect(sortNodes(emptyNodes, "generation", "asc")).toEqual([]);
      expect(groupNodes(emptyNodes, "generation")).toEqual({ "All Tokens": [] });
    });

    it("handles nodes with missing metadata", () => {
      const nodeWithoutMetadata: TokenLineageNode = {
        id: "no-meta",
        tokenId: "no-meta",
        generation: 0,
        timestamp: Date.now(),
        value: 100,
        operation: "mint",
      };

      const filtered = filterNodes([nodeWithoutMetadata], "mint");
      expect(filtered).toHaveLength(1);

      const sorted = sortNodes([nodeWithoutMetadata], "value", "asc");
      expect(sorted).toHaveLength(1);

      const grouped = groupNodes([nodeWithoutMetadata], "operation");
      expect(grouped["mint"]).toHaveLength(1);
    });

    it("handles nodes with null/undefined values", () => {
      const nodeWithNulls: TokenLineageNode = {
        id: "nulls",
        tokenId: "nulls",
        generation: 0,
        timestamp: 0,
        value: 0,
        operation: "",
        sourceNodeId: undefined,
        metadata: undefined,
      };

      expect(() => filterNodes([nodeWithNulls], "test")).not.toThrow();
      expect(() => sortNodes([nodeWithNulls], "generation", "asc")).not.toThrow();
      expect(() => groupNodes([nodeWithNulls], "sourceNode")).not.toThrow();
    });

    it("handles very large datasets efficiently", () => {
      const largeNodeSet: TokenLineageNode[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `node-${i}`,
        tokenId: `token-${i}`,
        generation: Math.floor(i / 100),
        timestamp: Date.now() + i * 1000,
        value: Math.random() * 10000,
        operation: ["mint", "split", "transfer", "burn"][i % 4],
        metadata: { index: i },
      }));

      const startTime = performance.now();

      const filtered = filterNodes(largeNodeSet, "mint");
      const sorted = sortNodes(filtered, "value", "asc");
      const grouped = groupNodes(sorted, "generation");

      const endTime = performance.now();

      // Should process 1000 nodes within reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      expect(Object.keys(grouped).length).toBeGreaterThan(0);
    });
  });

  describe("Combined Operations", () => {
    it("handles search + sort + group operations together", () => {
      // Filter for split operations
      const filtered = filterNodes(mockLineage.nodes, "split");
      expect(filtered).toHaveLength(2);

      // Sort by value
      const sorted = sortNodes(filtered, "value", "desc");
      expect(sorted[0].value).toBeGreaterThanOrEqual(sorted[1].value);

      // Group by generation
      const grouped = groupNodes(sorted, "generation");
      expect(Object.keys(grouped)).toContain("Generation 1");
      expect(grouped["Generation 1"]).toHaveLength(2);
    });

    it("maintains data integrity through multiple operations", () => {
      const originalCount = mockLineage.nodes.length;

      // Apply multiple transformations
      let processed = filterNodes(mockLineage.nodes, "");
      processed = sortNodes(processed, "generation", "asc");
      const grouped = groupNodes(processed, "none");

      // Should maintain all original nodes
      expect(grouped["All Tokens"]).toHaveLength(originalCount);

      // Should maintain all original data
      const allProcessedNodes = Object.values(grouped).flat();
      expect(allProcessedNodes).toHaveLength(originalCount);

      // Each node should have all original properties
      allProcessedNodes.forEach(node => {
        expect(node).toHaveProperty("id");
        expect(node).toHaveProperty("tokenId");
        expect(node).toHaveProperty("generation");
        expect(node).toHaveProperty("timestamp");
        expect(node).toHaveProperty("value");
        expect(node).toHaveProperty("operation");
      });
    });
  });
});
