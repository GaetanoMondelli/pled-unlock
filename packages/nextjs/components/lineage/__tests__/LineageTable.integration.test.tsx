import React from "react";
import LineageTable from "../LineageTable";
import { TokenLineage, TokenLineageNode } from "../types";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock data for comprehensive testing
const createMockLineage = (): TokenLineage => {
  const nodes: TokenLineageNode[] = [
    {
      id: "root-1",
      tokenId: "TOKEN-001",
      generation: 0,
      timestamp: 1640995200000, // 2022-01-01
      value: 10000,
      operation: "mint",
      metadata: {
        creator: "0x1234...5678",
        mintType: "initial",
        category: "utility",
        rarity: "common",
      },
    },
    {
      id: "split-1",
      tokenId: "TOKEN-002",
      generation: 1,
      timestamp: 1641081600000, // 2022-01-02
      value: 5000,
      operation: "split",
      sourceNodeId: "root-1",
      metadata: {
        parent: "TOKEN-001",
        splitRatio: 0.5,
        recipient: "0xabcd...efgh",
      },
    },
    {
      id: "split-2",
      tokenId: "TOKEN-003",
      generation: 1,
      timestamp: 1641168000000, // 2022-01-03
      value: 5000,
      operation: "split",
      sourceNodeId: "root-1",
      metadata: {
        parent: "TOKEN-001",
        splitRatio: 0.5,
        recipient: "0x9876...5432",
      },
    },
    {
      id: "transfer-1",
      tokenId: "TOKEN-004",
      generation: 2,
      timestamp: 1641254400000, // 2022-01-04
      value: 5000,
      operation: "transfer",
      sourceNodeId: "split-1",
      metadata: {
        from: "0xabcd...efgh",
        to: "0xdef0...1234",
        transferType: "sale",
        price: "1.5 ETH",
      },
    },
    {
      id: "burn-1",
      tokenId: "TOKEN-005",
      generation: 2,
      timestamp: 1641340800000, // 2022-01-05
      value: 2500,
      operation: "burn",
      sourceNodeId: "split-2",
      metadata: {
        burnReason: "deflationary",
        burner: "0x9876...5432",
        burnedAmount: 2500,
      },
    },
    {
      id: "remaining-1",
      tokenId: "TOKEN-006",
      generation: 2,
      timestamp: 1641340800000, // 2022-01-05
      value: 2500,
      operation: "split",
      sourceNodeId: "split-2",
      metadata: {
        parent: "TOKEN-003",
        splitReason: "partial_burn",
        recipient: "0x9876...5432",
      },
    },
    {
      id: "merge-1",
      tokenId: "TOKEN-007",
      generation: 3,
      timestamp: 1641427200000, // 2022-01-06
      value: 7500,
      operation: "merge",
      sourceNodeId: "transfer-1",
      metadata: {
        mergedWith: ["TOKEN-004", "TOKEN-006"],
        mergeType: "consolidation",
        newOwner: "0xdef0...1234",
      },
    },
    {
      id: "stake-1",
      tokenId: "TOKEN-008",
      generation: 4,
      timestamp: 1641513600000, // 2022-01-07
      value: 7500,
      operation: "stake",
      sourceNodeId: "merge-1",
      metadata: {
        stakingPool: "0xpool...addr",
        stakingDuration: "30 days",
        expectedReward: "5%",
        staker: "0xdef0...1234",
      },
    },
  ];

  const edges = [
    {
      id: "edge-1",
      sourceId: "root-1",
      targetId: "split-1",
      operation: "split",
      timestamp: 1641081600000,
    },
    {
      id: "edge-2",
      sourceId: "root-1",
      targetId: "split-2",
      operation: "split",
      timestamp: 1641168000000,
    },
    {
      id: "edge-3",
      sourceId: "split-1",
      targetId: "transfer-1",
      operation: "transfer",
      timestamp: 1641254400000,
    },
    {
      id: "edge-4",
      sourceId: "split-2",
      targetId: "burn-1",
      operation: "burn",
      timestamp: 1641340800000,
    },
    {
      id: "edge-5",
      sourceId: "split-2",
      targetId: "remaining-1",
      operation: "split",
      timestamp: 1641340800000,
    },
    {
      id: "edge-6",
      sourceId: "transfer-1",
      targetId: "merge-1",
      operation: "merge",
      timestamp: 1641427200000,
    },
    {
      id: "edge-7",
      sourceId: "merge-1",
      targetId: "stake-1",
      operation: "stake",
      timestamp: 1641513600000,
    },
  ];

  return {
    nodes,
    edges,
    rootTokenId: "TOKEN-001",
  };
};

const defaultProps = {
  lineage: createMockLineage(),
  onNodeSelect: jest.fn(),
  selectedNodeId: undefined,
};

describe("LineageTable Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Complete User Workflows", () => {
    it("supports complete sorting workflow across all columns", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      // Test generation sorting
      const generationHeader = screen.getByText("Generation");
      await user.click(generationHeader);

      let rows = screen.getAllByRole("row");
      let dataRows = rows.filter(row => row.textContent?.includes("TOKEN-"));
      expect(dataRows[0]).toHaveTextContent("TOKEN-008"); // Generation 4 (desc)

      // Test value sorting
      const valueHeader = screen.getByText("Value");
      await user.click(valueHeader);

      await waitFor(() => {
        rows = screen.getAllByRole("row");
        dataRows = rows.filter(row => row.textContent?.includes("TOKEN-"));
        expect(dataRows[0]).toHaveTextContent("TOKEN-005"); // Lowest value (2,500)
      });

      // Test timestamp sorting
      const timestampHeader = screen.getByText("Timestamp");
      await user.click(timestampHeader);

      await waitFor(() => {
        rows = screen.getAllByRole("row");
        dataRows = rows.filter(row => row.textContent?.includes("TOKEN-"));
        expect(dataRows[0]).toHaveTextContent("TOKEN-001"); // Earliest timestamp
      });

      // Test operation sorting
      const operationHeader = screen.getByText("Operation");
      await user.click(operationHeader);

      await waitFor(() => {
        rows = screen.getAllByRole("row");
        dataRows = rows.filter(row => row.textContent?.includes("TOKEN-"));
        expect(dataRows[0]).toHaveTextContent("burn"); // Alphabetically first
      });
    });

    it("supports complete grouping workflow with expansion/collapse", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      // Group by generation
      const groupButton = screen.getByText("Group: None");
      await user.click(groupButton);

      const generationOption = screen.getByText("Generation");
      await user.click(generationOption);

      await waitFor(() => {
        expect(screen.getByText("Generation 0 (1 tokens)")).toBeInTheDocument();
        expect(screen.getByText("Generation 1 (2 tokens)")).toBeInTheDocument();
        expect(screen.getByText("Generation 2 (3 tokens)")).toBeInTheDocument();
        expect(screen.getByText("Generation 3 (1 tokens)")).toBeInTheDocument();
        expect(screen.getByText("Generation 4 (1 tokens)")).toBeInTheDocument();
      });

      // Collapse Generation 1 group
      const gen1Group = screen.getByText("Generation 1 (2 tokens)");
      await user.click(gen1Group);

      await waitFor(() => {
        expect(screen.queryByText("TOKEN-002")).not.toBeInTheDocument();
        expect(screen.queryByText("TOKEN-003")).not.toBeInTheDocument();
      });

      // Expand Generation 1 group again
      await user.click(gen1Group);

      await waitFor(() => {
        expect(screen.getByText("TOKEN-002")).toBeInTheDocument();
        expect(screen.getByText("TOKEN-003")).toBeInTheDocument();
      });

      // Switch to operation grouping
      await user.click(screen.getByText("Group: generation"));
      const operationOption = screen.getByText("Operation");
      await user.click(operationOption);

      await waitFor(() => {
        expect(screen.getByText("burn (1 tokens)")).toBeInTheDocument();
        expect(screen.getByText("merge (1 tokens)")).toBeInTheDocument();
        expect(screen.getByText("mint (1 tokens)")).toBeInTheDocument();
        expect(screen.getByText("split (3 tokens)")).toBeInTheDocument();
        expect(screen.getByText("stake (1 tokens)")).toBeInTheDocument();
        expect(screen.getByText("transfer (1 tokens)")).toBeInTheDocument();
      });
    });

    it("supports complete search and filter workflow", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search tokens...");

      // Search by token ID
      await user.type(searchInput, "TOKEN-001");
      await waitFor(() => {
        expect(screen.getByText("Showing 1 of 8 tokens")).toBeInTheDocument();
        expect(screen.getByText("TOKEN-001")).toBeInTheDocument();
        expect(screen.queryByText("TOKEN-002")).not.toBeInTheDocument();
      });

      // Clear and search by operation
      await user.clear(searchInput);
      await user.type(searchInput, "split");
      await waitFor(() => {
        expect(screen.getByText("Showing 3 of 8 tokens")).toBeInTheDocument();
        expect(screen.getByText("TOKEN-002")).toBeInTheDocument();
        expect(screen.getByText("TOKEN-003")).toBeInTheDocument();
        expect(screen.getByText("TOKEN-006")).toBeInTheDocument();
      });

      // Search by metadata content
      await user.clear(searchInput);
      await user.type(searchInput, "0xdef0");
      await waitFor(() => {
        expect(screen.getByText("Showing 2 of 8 tokens")).toBeInTheDocument();
        expect(screen.getByText("TOKEN-004")).toBeInTheDocument();
        expect(screen.getByText("TOKEN-007")).toBeInTheDocument();
      });

      // Clear search
      await user.clear(searchInput);
      await waitFor(() => {
        expect(screen.getByText("Showing 8 of 8 tokens")).toBeInTheDocument();
      });
    });

    it("supports complete column visibility workflow", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const columnsButton = screen.getByText("Columns");
      await user.click(columnsButton);

      // Hide generation column
      const generationCheckbox = screen.getByText("Generation");
      await user.click(generationCheckbox);

      await waitFor(() => {
        expect(screen.queryByText("Generation")).not.toBeInTheDocument();
      });

      // Show metadata column
      const metadataCheckbox = screen.getByText("Metadata");
      await user.click(metadataCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Metadata")).toBeInTheDocument();
        expect(screen.getByText("4 fields")).toBeInTheDocument(); // root-1 has 4 metadata fields
      });

      // Hide multiple columns
      await user.click(columnsButton);
      const timestampCheckbox = screen.getByText("Timestamp");
      const valueCheckbox = screen.getByText("Value");
      await user.click(timestampCheckbox);
      await user.click(valueCheckbox);

      await waitFor(() => {
        expect(screen.queryByText("Timestamp")).not.toBeInTheDocument();
        expect(screen.queryByText("Value")).not.toBeInTheDocument();
      });

      // Restore all columns
      await user.click(columnsButton);
      await user.click(generationCheckbox);
      await user.click(timestampCheckbox);
      await user.click(valueCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Generation")).toBeInTheDocument();
        expect(screen.getByText("Timestamp")).toBeInTheDocument();
        expect(screen.getByText("Value")).toBeInTheDocument();
      });
    });

    it("supports complete row expansion workflow with detailed metadata", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      // Find and click the first expand button
      const expandButtons = screen.getAllByRole("button");
      const firstExpandButton = expandButtons.find(
        button => button.querySelector("svg") && button.className.includes("h-6 w-6"),
      );

      expect(firstExpandButton).toBeTruthy();
      await user.click(firstExpandButton!);

      await waitFor(() => {
        expect(screen.getByText("Token ID:")).toBeInTheDocument();
        expect(screen.getByText("Node ID:")).toBeInTheDocument();
        expect(screen.getByText("Metadata:")).toBeInTheDocument();

        // Check for specific metadata content
        expect(screen.getByText('"creator"')).toBeInTheDocument();
        expect(screen.getByText('"0x1234...5678"')).toBeInTheDocument();
        expect(screen.getByText('"mintType"')).toBeInTheDocument();
        expect(screen.getByText('"initial"')).toBeInTheDocument();
      });

      // Collapse the row
      await user.click(firstExpandButton!);

      await waitFor(() => {
        expect(screen.queryByText("Token ID:")).not.toBeInTheDocument();
        expect(screen.queryByText("Node ID:")).not.toBeInTheDocument();
      });

      // Expand a different row with different metadata structure
      const allRows = screen.getAllByRole("row");
      const transferRow = allRows.find(row => row.textContent?.includes("TOKEN-004"));
      const transferExpandButton = within(transferRow!).getAllByRole("button")[0];

      await user.click(transferExpandButton);

      await waitFor(() => {
        expect(screen.getByText("Source Node:")).toBeInTheDocument();
        expect(screen.getByText("split-1")).toBeInTheDocument();
        expect(screen.getByText('"transferType"')).toBeInTheDocument();
        expect(screen.getByText('"sale"')).toBeInTheDocument();
        expect(screen.getByText('"price"')).toBeInTheDocument();
        expect(screen.getByText('"1.5 ETH"')).toBeInTheDocument();
      });
    });
  });

  describe("Complex Integration Scenarios", () => {
    it("maintains state consistency across multiple operations", async () => {
      const user = userEvent.setup();
      const mockOnNodeSelect = jest.fn();
      render(<LineageTable {...defaultProps} onNodeSelect={mockOnNodeSelect} />);

      // 1. Group by generation
      const groupButton = screen.getByText("Group: None");
      await user.click(groupButton);
      await user.click(screen.getByText("Generation"));

      // 2. Hide some columns
      const columnsButton = screen.getByText("Columns");
      await user.click(columnsButton);
      await user.click(screen.getByText("Timestamp"));

      // 3. Search for specific tokens
      const searchInput = screen.getByPlaceholderText("Search tokens...");
      await user.type(searchInput, "split");

      // 4. Sort by value
      const valueHeader = screen.getByText("Value");
      await user.click(valueHeader);

      await waitFor(() => {
        // Should show grouped results, filtered by search, sorted by value, with timestamp hidden
        expect(screen.getByText("Generation 1 (2 tokens)")).toBeInTheDocument();
        expect(screen.getByText("Generation 2 (1 tokens)")).toBeInTheDocument();
        expect(screen.queryByText("Timestamp")).not.toBeInTheDocument();
        expect(screen.getByText("Showing 3 of 8 tokens")).toBeInTheDocument();
      });

      // 5. Select a node
      const tokenRow = screen.getAllByRole("row").find(row => row.textContent?.includes("TOKEN-002"));
      await user.click(tokenRow!);

      expect(mockOnNodeSelect).toHaveBeenCalledWith("split-1");

      // 6. Expand a row
      const expandButton = within(tokenRow!).getAllByRole("button")[0];
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText("Token ID:")).toBeInTheDocument();
        expect(screen.getByText("TOKEN-002")).toBeInTheDocument();
      });
    });

    it("handles dynamic data updates correctly", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<LineageTable {...defaultProps} />);

      // Initial state
      expect(screen.getByText("Showing 8 of 8 tokens")).toBeInTheDocument();

      // Add search filter
      const searchInput = screen.getByPlaceholderText("Search tokens...");
      await user.type(searchInput, "mint");

      await waitFor(() => {
        expect(screen.getByText("Showing 1 of 8 tokens")).toBeInTheDocument();
      });

      // Update lineage data
      const updatedLineage = createMockLineage();
      updatedLineage.nodes.push({
        id: "new-mint",
        tokenId: "TOKEN-009",
        generation: 0,
        timestamp: Date.now(),
        value: 15000,
        operation: "mint",
        metadata: { creator: "0xnew...addr" },
      });

      rerender(<LineageTable {...defaultProps} lineage={updatedLineage} />);

      await waitFor(() => {
        expect(screen.getByText("Showing 2 of 9 tokens")).toBeInTheDocument();
        expect(screen.getByText("TOKEN-009")).toBeInTheDocument();
      });
    });

    it("handles edge cases gracefully", async () => {
      const user = userEvent.setup();

      // Test with empty lineage
      const emptyLineage: TokenLineage = {
        nodes: [],
        edges: [],
        rootTokenId: "",
      };

      const { rerender } = render(<LineageTable {...defaultProps} lineage={emptyLineage} />);
      expect(screen.getByText("Showing 0 of 0 tokens")).toBeInTheDocument();

      // Test with single node
      const singleNodeLineage: TokenLineage = {
        nodes: [
          {
            id: "single",
            tokenId: "SINGLE-001",
            generation: 0,
            timestamp: Date.now(),
            value: 1000,
            operation: "mint",
          },
        ],
        edges: [],
        rootTokenId: "SINGLE-001",
      };

      rerender(<LineageTable {...defaultProps} lineage={singleNodeLineage} />);
      expect(screen.getByText("Showing 1 of 1 tokens")).toBeInTheDocument();
      expect(screen.getByText("SINGLE-001")).toBeInTheDocument();

      // Test grouping with single node
      const groupButton = screen.getByText("Group: None");
      await user.click(groupButton);
      await user.click(screen.getByText("Generation"));

      await waitFor(() => {
        expect(screen.getByText("Generation 0 (1 tokens)")).toBeInTheDocument();
      });

      // Test search with no results
      const searchInput = screen.getByPlaceholderText("Search tokens...");
      await user.type(searchInput, "nonexistent");

      await waitFor(() => {
        expect(screen.getByText("Showing 0 of 1 tokens")).toBeInTheDocument();
      });
    });
  });

  describe("Performance and Accessibility", () => {
    it("handles large datasets efficiently", async () => {
      const largeLineage = createMockLineage();

      // Add 1000 more nodes
      for (let i = 0; i < 1000; i++) {
        largeLineage.nodes.push({
          id: `large-${i}`,
          tokenId: `LARGE-${i.toString().padStart(3, "0")}`,
          generation: Math.floor(i / 100),
          timestamp: Date.now() + i * 1000,
          value: Math.random() * 10000,
          operation: i % 2 === 0 ? "mint" : "transfer",
          metadata: { index: i },
        });
      }

      const startTime = performance.now();
      render(<LineageTable {...defaultProps} lineage={largeLineage} />);
      const endTime = performance.now();

      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(2000);
      expect(screen.getByText("Showing 1008 of 1008 tokens")).toBeInTheDocument();
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByPlaceholderText("Search tokens...")).toHaveFocus();

      await user.tab();
      expect(screen.getByText("Group: None")).toHaveFocus();

      await user.tab();
      expect(screen.getByText("Columns")).toHaveFocus();

      // Test keyboard interaction with dropdowns
      await user.keyboard("{Enter}");
      expect(screen.getByText("Toggle Columns")).toBeInTheDocument();

      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(screen.queryByText("Toggle Columns")).not.toBeInTheDocument();
      });
    });

    it("maintains proper ARIA attributes and roles", () => {
      render(<LineageTable {...defaultProps} />);

      // Check table structure
      const table = screen.getByRole("table");
      expect(table).toBeInTheDocument();

      const columnHeaders = screen.getAllByRole("columnheader");
      expect(columnHeaders.length).toBeGreaterThan(0);

      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(1); // Header + data rows

      // Check interactive elements
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);

      const searchInput = screen.getByRole("textbox");
      expect(searchInput).toHaveAttribute("placeholder", "Search tokens...");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("handles malformed data gracefully", () => {
      const malformedLineage: TokenLineage = {
        nodes: [
          {
            id: "malformed",
            tokenId: "MALFORMED-001",
            generation: 0,
            timestamp: NaN,
            value: -1000,
            operation: "",
            metadata: null as any,
          },
        ],
        edges: [],
        rootTokenId: "MALFORMED-001",
      };

      render(<LineageTable {...defaultProps} lineage={malformedLineage} />);

      expect(screen.getByText("MALFORMED-001")).toBeInTheDocument();
      expect(screen.getByText("Showing 1 of 1 tokens")).toBeInTheDocument();
    });

    it("handles missing optional callbacks", () => {
      const { onNodeSelect, ...propsWithoutCallback } = defaultProps;

      expect(() => {
        render(<LineageTable {...propsWithoutCallback} />);
      }).not.toThrow();

      expect(screen.getByText("TOKEN-001")).toBeInTheDocument();
    });

    it("handles rapid state changes", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search tokens...");

      // Rapid typing
      await user.type(searchInput, "TOKEN", { delay: 1 });
      await user.clear(searchInput);
      await user.type(searchInput, "split", { delay: 1 });
      await user.clear(searchInput);
      await user.type(searchInput, "mint", { delay: 1 });

      await waitFor(() => {
        expect(screen.getByText("Showing 1 of 8 tokens")).toBeInTheDocument();
      });
    });
  });
});
