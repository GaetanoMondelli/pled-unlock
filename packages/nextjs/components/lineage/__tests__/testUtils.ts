import { TokenLineage, TokenLineageEdge, TokenLineageNode } from "../types";

/**
 * Utility functions for creating test data for LineageTable tests
 */

export const createMockNode = (overrides: Partial<TokenLineageNode> = {}): TokenLineageNode => ({
  id: "mock-node-id",
  tokenId: "MOCK-TOKEN",
  generation: 0,
  timestamp: Date.now(),
  value: 1000,
  operation: "mint",
  metadata: { test: "data" },
  ...overrides,
});

export const createMockEdge = (overrides: Partial<TokenLineageEdge> = {}): TokenLineageEdge => ({
  id: "mock-edge-id",
  sourceId: "source-node",
  targetId: "target-node",
  operation: "transfer",
  timestamp: Date.now(),
  ...overrides,
});

export const createMockLineage = (
  nodes: TokenLineageNode[] = [],
  edges: TokenLineageEdge[] = [],
  rootTokenId: string = "root-token",
): TokenLineage => ({
  nodes,
  edges,
  rootTokenId,
});

/**
 * Creates a complex lineage tree for testing various scenarios
 */
export const createComplexLineage = (): TokenLineage => {
  const nodes: TokenLineageNode[] = [
    // Generation 0 - Root tokens
    createMockNode({
      id: "root-1",
      tokenId: "ROOT-001",
      generation: 0,
      timestamp: 1640995200000,
      value: 10000,
      operation: "mint",
      metadata: { creator: "0x1234", type: "genesis" },
    }),
    createMockNode({
      id: "root-2",
      tokenId: "ROOT-002",
      generation: 0,
      timestamp: 1640995300000,
      value: 5000,
      operation: "mint",
      metadata: { creator: "0x5678", type: "genesis" },
    }),

    // Generation 1 - First splits
    createMockNode({
      id: "split-1-1",
      tokenId: "SPLIT-001",
      generation: 1,
      timestamp: 1641081600000,
      value: 5000,
      operation: "split",
      sourceNodeId: "root-1",
      metadata: { parent: "ROOT-001", ratio: 0.5 },
    }),
    createMockNode({
      id: "split-1-2",
      tokenId: "SPLIT-002",
      generation: 1,
      timestamp: 1641081700000,
      value: 5000,
      operation: "split",
      sourceNodeId: "root-1",
      metadata: { parent: "ROOT-001", ratio: 0.5 },
    }),

    // Generation 2 - Transfers and burns
    createMockNode({
      id: "transfer-1",
      tokenId: "TRANSFER-001",
      generation: 2,
      timestamp: 1641168000000,
      value: 5000,
      operation: "transfer",
      sourceNodeId: "split-1-1",
      metadata: { from: "0x1234", to: "0xabcd" },
    }),
    createMockNode({
      id: "burn-1",
      tokenId: "BURN-001",
      generation: 2,
      timestamp: 1641168100000,
      value: 2500,
      operation: "burn",
      sourceNodeId: "split-1-2",
      metadata: { burnReason: "deflationary", amount: 2500 },
    }),
    createMockNode({
      id: "remaining-1",
      tokenId: "REMAINING-001",
      generation: 2,
      timestamp: 1641168100000,
      value: 2500,
      operation: "split",
      sourceNodeId: "split-1-2",
      metadata: { parent: "SPLIT-002", remaining: true },
    }),

    // Generation 3 - Complex operations
    createMockNode({
      id: "merge-1",
      tokenId: "MERGE-001",
      generation: 3,
      timestamp: 1641254400000,
      value: 7500,
      operation: "merge",
      sourceNodeId: "transfer-1",
      metadata: {
        mergedWith: ["TRANSFER-001", "REMAINING-001"],
        newOwner: "0xabcd",
      },
    }),
  ];

  const edges: TokenLineageEdge[] = [
    createMockEdge({
      id: "edge-1",
      sourceId: "root-1",
      targetId: "split-1-1",
      operation: "split",
      timestamp: 1641081600000,
    }),
    createMockEdge({
      id: "edge-2",
      sourceId: "root-1",
      targetId: "split-1-2",
      operation: "split",
      timestamp: 1641081700000,
    }),
    createMockEdge({
      id: "edge-3",
      sourceId: "split-1-1",
      targetId: "transfer-1",
      operation: "transfer",
      timestamp: 1641168000000,
    }),
    createMockEdge({
      id: "edge-4",
      sourceId: "split-1-2",
      targetId: "burn-1",
      operation: "burn",
      timestamp: 1641168100000,
    }),
    createMockEdge({
      id: "edge-5",
      sourceId: "split-1-2",
      targetId: "remaining-1",
      operation: "split",
      timestamp: 1641168100000,
    }),
    createMockEdge({
      id: "edge-6",
      sourceId: "transfer-1",
      targetId: "merge-1",
      operation: "merge",
      timestamp: 1641254400000,
    }),
  ];

  return createMockLineage(nodes, edges, "ROOT-001");
};

/**
 * Creates a large lineage for performance testing
 */
export const createLargeLineage = (nodeCount: number = 1000): TokenLineage => {
  const nodes: TokenLineageNode[] = [];
  const edges: TokenLineageEdge[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const generation = Math.floor(i / 100);
    const operation = ["mint", "split", "transfer", "burn", "merge"][i % 5];

    nodes.push(
      createMockNode({
        id: `large-node-${i}`,
        tokenId: `LARGE-${i.toString().padStart(4, "0")}`,
        generation,
        timestamp: 1640995200000 + i * 1000,
        value: Math.floor(Math.random() * 10000) + 100,
        operation,
        sourceNodeId: i > 0 ? `large-node-${Math.floor(i / 2)}` : undefined,
        metadata: {
          index: i,
          batch: Math.floor(i / 50),
          category: ["A", "B", "C"][i % 3],
        },
      }),
    );

    if (i > 0) {
      edges.push(
        createMockEdge({
          id: `large-edge-${i}`,
          sourceId: `large-node-${Math.floor(i / 2)}`,
          targetId: `large-node-${i}`,
          operation,
          timestamp: 1640995200000 + i * 1000,
        }),
      );
    }
  }

  return createMockLineage(nodes, edges, "LARGE-0000");
};

/**
 * Creates lineage with edge cases for testing error handling
 */
export const createEdgeCaseLineage = (): TokenLineage => {
  const nodes: TokenLineageNode[] = [
    // Node with minimal data
    createMockNode({
      id: "minimal",
      tokenId: "MINIMAL",
      generation: 0,
      timestamp: 0,
      value: 0,
      operation: "",
    }),

    // Node with extreme values
    createMockNode({
      id: "extreme",
      tokenId: "EXTREME",
      generation: 999,
      timestamp: Number.MAX_SAFE_INTEGER,
      value: Number.MAX_SAFE_INTEGER,
      operation: "extreme-operation-with-very-long-name",
      metadata: {
        veryLongKey: "very-long-value-that-might-cause-display-issues",
        nested: {
          deeply: {
            nested: {
              object: "value",
            },
          },
        },
        array: [1, 2, 3, 4, 5],
        nullValue: null,
        undefinedValue: undefined,
      },
    }),

    // Node with special characters
    createMockNode({
      id: "special-chars",
      tokenId: "SPECIAL-!@#$%^&*()",
      generation: 1,
      timestamp: 1641081600000,
      value: 1000,
      operation: "split & merge",
      sourceNodeId: "minimal",
      metadata: {
        "key with spaces": "value with spaces",
        "key-with-dashes": "value-with-dashes",
        key_with_underscores: "value_with_underscores",
        unicode: "🚀🌟💎",
      },
    }),
  ];

  const edges: TokenLineageEdge[] = [
    createMockEdge({
      id: "edge-minimal",
      sourceId: "minimal",
      targetId: "special-chars",
      operation: "split & merge",
      timestamp: 1641081600000,
    }),
  ];

  return createMockLineage(nodes, edges, "MINIMAL");
};

/**
 * Helper function to wait for async operations in tests
 */
export const waitForAsync = (ms: number = 0): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Helper function to create a mock event
 */
export const createMockEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: null,
    currentTarget: null,
    type: "click",
    bubbles: true,
    cancelable: true,
    ...overrides,
  }) as Event;

/**
 * Helper function to get visible table rows (excluding headers and group rows)
 */
export const getDataRows = (container: HTMLElement): HTMLElement[] => {
  const rows = Array.from(container.querySelectorAll("tr"));
  return rows.filter(row => {
    const text = row.textContent || "";
    return (
      text.includes("TOKEN-") ||
      text.includes("MOCK-") ||
      text.includes("ROOT-") ||
      text.includes("SPLIT-") ||
      text.includes("TRANSFER-") ||
      text.includes("BURN-") ||
      text.includes("REMAINING-") ||
      text.includes("MERGE-") ||
      text.includes("LARGE-") ||
      text.includes("MINIMAL") ||
      text.includes("EXTREME") ||
      text.includes("SPECIAL-")
    );
  });
};

/**
 * Helper function to get group header rows
 */
export const getGroupRows = (container: HTMLElement): HTMLElement[] => {
  const rows = Array.from(container.querySelectorAll("tr"));
  return rows.filter(row => {
    const text = row.textContent || "";
    return (
      text.includes("Generation ") ||
      text.includes(" tokens)") ||
      text.includes("Root Tokens") ||
      text.includes("Unknown Operation")
    );
  });
};

/**
 * Helper function to simulate user interactions
 */
export const simulateUserInteraction = {
  clickSort: async (columnName: string, container: HTMLElement) => {
    const header = container.querySelector(`button:has-text("${columnName}")`);
    if (header) {
      header.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  },

  search: async (searchTerm: string, container: HTMLElement) => {
    const searchInput = container.querySelector('input[placeholder="Search tokens..."]') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = searchTerm;
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  },

  expandRow: async (rowIndex: number, container: HTMLElement) => {
    const dataRows = getDataRows(container);
    const expandButton = dataRows[rowIndex]?.querySelector("button");
    if (expandButton) {
      expandButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  },
};

export default {
  createMockNode,
  createMockEdge,
  createMockLineage,
  createComplexLineage,
  createLargeLineage,
  createEdgeCaseLineage,
  waitForAsync,
  createMockEvent,
  getDataRows,
  getGroupRows,
  simulateUserInteraction,
};
