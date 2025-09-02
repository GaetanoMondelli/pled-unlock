import React from "react";
import LineageTable from "../LineageTable";
import { TokenLineage, TokenLineageNode } from "../types";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock data for unit testing
const mockNodes: TokenLineageNode[] = [
  {
    id: "node1",
    tokenId: "token1",
    generation: 0,
    timestamp: 1640995200000, // 2022-01-01
    value: 1000,
    operation: "mint",
    metadata: { creator: "user1", type: "original" },
  },
  {
    id: "node2",
    tokenId: "token2",
    generation: 1,
    timestamp: 1641081600000, // 2022-01-02
    value: 500,
    operation: "split",
    sourceNodeId: "node1",
    metadata: { parent: "token1" },
  },
  {
    id: "node3",
    tokenId: "token3",
    generation: 1,
    timestamp: 1641168000000, // 2022-01-03
    value: 500,
    operation: "split",
    sourceNodeId: "node1",
    metadata: { parent: "token1" },
  },
  {
    id: "node4",
    tokenId: "token4",
    generation: 2,
    timestamp: 1641254400000, // 2022-01-04
    value: 250,
    operation: "transfer",
    sourceNodeId: "node2",
    metadata: { recipient: "user2" },
  },
];

const mockLineage: TokenLineage = {
  nodes: mockNodes,
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

const defaultProps = {
  lineage: mockLineage,
  onNodeSelect: jest.fn(),
  selectedNodeId: undefined,
};

describe("LineageTable Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders the table with all nodes", () => {
      render(<LineageTable {...defaultProps} />);

      expect(screen.getByText("token1")).toBeInTheDocument();
      expect(screen.getByText("token2")).toBeInTheDocument();
      expect(screen.getByText("token3")).toBeInTheDocument();
      expect(screen.getByText("token4")).toBeInTheDocument();
    });

    it("displays correct column headers", () => {
      render(<LineageTable {...defaultProps} />);

      expect(screen.getByText("Generation")).toBeInTheDocument();
      expect(screen.getByText("Timestamp")).toBeInTheDocument();
      expect(screen.getByText("Value")).toBeInTheDocument();
      expect(screen.getByText("Operation")).toBeInTheDocument();
      expect(screen.getByText("Source Node")).toBeInTheDocument();
    });

    it("shows summary information", () => {
      render(<LineageTable {...defaultProps} />);
      expect(screen.getByText("Showing 4 of 4 tokens")).toBeInTheDocument();
    });

    it("renders control elements", () => {
      render(<LineageTable {...defaultProps} />);

      expect(screen.getByPlaceholderText("Search tokens...")).toBeInTheDocument();
      expect(screen.getByText("Group: None")).toBeInTheDocument();
      expect(screen.getByText("Columns")).toBeInTheDocument();
    });
  });

  describe("Sorting Functionality", () => {
    it("sorts by generation ascending by default", () => {
      render(<LineageTable {...defaultProps} />);

      const rows = screen.getAllByRole("row");
      const dataRows = rows.filter(row => row.textContent?.includes("token"));

      expect(dataRows[0]).toHaveTextContent("token1"); // generation 0
      expect(dataRows[1]).toHaveTextContent("token2"); // generation 1
      expect(dataRows[2]).toHaveTextContent("token3"); // generation 1
      expect(dataRows[3]).toHaveTextContent("token4"); // generation 2
    });

    it("toggles sort direction when clicking the same column", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const generationHeader = screen.getByText("Generation");

      // Click to sort descending
      await user.click(generationHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        const dataRows = rows.filter(row => row.textContent?.includes("token"));
        expect(dataRows[0]).toHaveTextContent("token4"); // generation 2
      });
    });

    it("sorts by value when value column is clicked", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const valueHeader = screen.getByText("Value");
      await user.click(valueHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        const dataRows = rows.filter(row => row.textContent?.includes("token"));
        expect(dataRows[0]).toHaveTextContent("250"); // lowest value
      });
    });

    it("sorts by timestamp correctly", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const timestampHeader = screen.getByText("Timestamp");
      await user.click(timestampHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        const dataRows = rows.filter(row => row.textContent?.includes("token"));
        expect(dataRows[0]).toHaveTextContent("token1"); // earliest timestamp
      });
    });

    it("sorts by operation alphabetically", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const operationHeader = screen.getByText("Operation");
      await user.click(operationHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        const dataRows = rows.filter(row => row.textContent?.includes("token"));
        expect(dataRows[0]).toHaveTextContent("mint"); // alphabetically first
      });
    });

    it("displays sort indicators correctly", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const generationHeader = screen.getByText("Generation");

      // Should show ascending indicator by default
      expect(generationHeader.parentElement).toContainHTML("ChevronUp");

      // Click to change to descending
      await user.click(generationHeader);

      await waitFor(() => {
        expect(generationHeader.parentElement).toContainHTML("ChevronDown");
      });
    });
  });

  describe("Search Functionality", () => {
    it("filters nodes based on search term", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search tokens...");
      await user.type(searchInput, "token1");

      await waitFor(() => {
        expect(screen.getByText("token1")).toBeInTheDocument();
        expect(screen.queryByText("token2")).not.toBeInTheDocument();
        expect(screen.queryByText("token3")).not.toBeInTheDocument();
        expect(screen.queryByText("token4")).not.toBeInTheDocument();
      });

      expect(screen.getByText("Showing 1 of 4 tokens")).toBeInTheDocument();
    });

    it("searches across all node properties", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search tokens...");
      await user.type(searchInput, "split");

      await waitFor(() => {
        expect(screen.getByText("token2")).toBeInTheDocument();
        expect(screen.getByText("token3")).toBeInTheDocument();
        expect(screen.queryByText("token1")).not.toBeInTheDocument();
        expect(screen.queryByText("token4")).not.toBeInTheDocument();
      });

      expect(screen.getByText("Showing 2 of 4 tokens")).toBeInTheDocument();
    });

    it("is case insensitive", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search tokens...");
      await user.type(searchInput, "MINT");

      await waitFor(() => {
        expect(screen.getByText("token1")).toBeInTheDocument();
        expect(screen.getByText("Showing 1 of 4 tokens")).toBeInTheDocument();
      });
    });

    it("shows all nodes when search is cleared", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search tokens...");
      await user.type(searchInput, "token1");
      await user.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByText("Showing 4 of 4 tokens")).toBeInTheDocument();
      });
    });

    it("searches in metadata", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search tokens...");
      await user.type(searchInput, "user1");

      await waitFor(() => {
        expect(screen.getByText("token1")).toBeInTheDocument();
        expect(screen.getByText("Showing 1 of 4 tokens")).toBeInTheDocument();
      });
    });
  });

  describe("Grouping Functionality", () => {
    it("groups by generation when selected", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const groupButton = screen.getByText("Group: None");
      await user.click(groupButton);

      const generationOption = screen.getByText("Generation");
      await user.click(generationOption);

      await waitFor(() => {
        expect(screen.getByText("Generation 0 (1 tokens)")).toBeInTheDocument();
        expect(screen.getByText("Generation 1 (2 tokens)")).toBeInTheDocument();
        expect(screen.getByText("Generation 2 (1 tokens)")).toBeInTheDocument();
      });
    });

    it("groups by operation when selected", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const groupButton = screen.getByText("Group: None");
      await user.click(groupButton);

      const operationOption = screen.getByText("Operation");
      await user.click(operationOption);

      await waitFor(() => {
        expect(screen.getByText("mint (1 tokens)")).toBeInTheDocument();
        expect(screen.getByText("split (2 tokens)")).toBeInTheDocument();
        expect(screen.getByText("transfer (1 tokens)")).toBeInTheDocument();
      });
    });

    it("groups by source node when selected", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const groupButton = screen.getByText("Group: None");
      await user.click(groupButton);

      const sourceNodeOption = screen.getByText("Source Node");
      await user.click(sourceNodeOption);

      await waitFor(() => {
        expect(screen.getByText("Root Tokens (1 tokens)")).toBeInTheDocument();
        expect(screen.getByText("node1 (2 tokens)")).toBeInTheDocument();
        expect(screen.getByText("node2 (1 tokens)")).toBeInTheDocument();
      });
    });

    it("expands and collapses groups", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      // Group by generation
      const groupButton = screen.getByText("Group: None");
      await user.click(groupButton);
      const generationOption = screen.getByText("Generation");
      await user.click(generationOption);

      await waitFor(() => {
        expect(screen.getByText("Generation 0 (1 tokens)")).toBeInTheDocument();
      });

      // Collapse a group
      const gen0Group = screen.getByText("Generation 0 (1 tokens)");
      await user.click(gen0Group);

      await waitFor(() => {
        expect(screen.queryByText("token1")).not.toBeInTheDocument();
      });

      // Expand the group again
      await user.click(gen0Group);

      await waitFor(() => {
        expect(screen.getByText("token1")).toBeInTheDocument();
      });
    });

    it("updates group button text when grouping changes", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const groupButton = screen.getByText("Group: None");
      await user.click(groupButton);

      const generationOption = screen.getByText("Generation");
      await user.click(generationOption);

      await waitFor(() => {
        expect(screen.getByText("Group: generation")).toBeInTheDocument();
      });
    });
  });

  describe("Column Visibility", () => {
    it("toggles column visibility", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const columnsButton = screen.getByText("Columns");
      await user.click(columnsButton);

      const generationCheckbox = screen.getByText("Generation");
      await user.click(generationCheckbox);

      await waitFor(() => {
        expect(screen.queryByText("Generation")).not.toBeInTheDocument();
      });
    });

    it("shows metadata column when enabled", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const columnsButton = screen.getByText("Columns");
      await user.click(columnsButton);

      const metadataCheckbox = screen.getByText("Metadata");
      await user.click(metadataCheckbox);

      await waitFor(() => {
        expect(screen.getByText("Metadata")).toBeInTheDocument();
        expect(screen.getByText("2 fields")).toBeInTheDocument(); // node1 has 2 metadata fields
      });
    });

    it("hides multiple columns simultaneously", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const columnsButton = screen.getByText("Columns");
      await user.click(columnsButton);

      const timestampCheckbox = screen.getByText("Timestamp");
      const valueCheckbox = screen.getByText("Value");

      await user.click(timestampCheckbox);
      await user.click(valueCheckbox);

      await waitFor(() => {
        expect(screen.queryByText("Timestamp")).not.toBeInTheDocument();
        expect(screen.queryByText("Value")).not.toBeInTheDocument();
      });
    });

    it("maintains column visibility state across other operations", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      // Hide generation column
      const columnsButton = screen.getByText("Columns");
      await user.click(columnsButton);
      const generationCheckbox = screen.getByText("Generation");
      await user.click(generationCheckbox);

      // Perform search
      const searchInput = screen.getByPlaceholderText("Search tokens...");
      await user.type(searchInput, "token1");

      await waitFor(() => {
        expect(screen.queryByText("Generation")).not.toBeInTheDocument();
        expect(screen.getByText("token1")).toBeInTheDocument();
      });
    });
  });

  describe("Expandable Rows", () => {
    it("expands row to show detailed information", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const expandButtons = screen.getAllByRole("button");
      const firstExpandButton = expandButtons.find(
        button => button.querySelector("svg") && button.className.includes("h-6 w-6"),
      );

      if (firstExpandButton) {
        await user.click(firstExpandButton);

        await waitFor(() => {
          expect(screen.getByText("Token ID:")).toBeInTheDocument();
          expect(screen.getByText("Node ID:")).toBeInTheDocument();
        });
      }
    });

    it("shows metadata in expanded view", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const expandButtons = screen.getAllByRole("button");
      const firstExpandButton = expandButtons.find(
        button => button.querySelector("svg") && button.className.includes("h-6 w-6"),
      );

      if (firstExpandButton) {
        await user.click(firstExpandButton);

        await waitFor(() => {
          expect(screen.getByText("Metadata:")).toBeInTheDocument();
          expect(screen.getByText('"creator"')).toBeInTheDocument();
          expect(screen.getByText('"user1"')).toBeInTheDocument();
        });
      }
    });

    it("collapses expanded row when clicked again", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const expandButtons = screen.getAllByRole("button");
      const firstExpandButton = expandButtons.find(
        button => button.querySelector("svg") && button.className.includes("h-6 w-6"),
      );

      if (firstExpandButton) {
        // Expand
        await user.click(firstExpandButton);
        await waitFor(() => {
          expect(screen.getByText("Token ID:")).toBeInTheDocument();
        });

        // Collapse
        await user.click(firstExpandButton);
        await waitFor(() => {
          expect(screen.queryByText("Token ID:")).not.toBeInTheDocument();
        });
      }
    });

    it("shows source node information when available", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      // Find a row with source node (not the root token)
      const rows = screen.getAllByRole("row");
      const nodeWithSource = rows.find(row => row.textContent?.includes("token2"));

      if (nodeWithSource) {
        const expandButton = nodeWithSource.querySelector("button");
        if (expandButton) {
          await user.click(expandButton);

          await waitFor(() => {
            expect(screen.getByText("Source Node:")).toBeInTheDocument();
            expect(screen.getByText("node1")).toBeInTheDocument();
          });
        }
      }
    });

    it("handles nodes without metadata gracefully", async () => {
      const user = userEvent.setup();

      const nodeWithoutMetadata: TokenLineageNode = {
        id: "no-meta",
        tokenId: "NO-META-001",
        generation: 0,
        timestamp: Date.now(),
        value: 100,
        operation: "mint",
      };

      const lineageWithoutMetadata: TokenLineage = {
        nodes: [nodeWithoutMetadata],
        edges: [],
        rootTokenId: "NO-META-001",
      };

      render(<LineageTable {...defaultProps} lineage={lineageWithoutMetadata} />);

      const expandButton = screen
        .getAllByRole("button")
        .find(button => button.querySelector("svg") && button.className.includes("h-6 w-6"));

      if (expandButton) {
        await user.click(expandButton);

        await waitFor(() => {
          expect(screen.getByText("Token ID:")).toBeInTheDocument();
          expect(screen.getByText("NO-META-001")).toBeInTheDocument();
          expect(screen.queryByText("Metadata:")).not.toBeInTheDocument();
        });
      }
    });
  });

  describe("Node Selection", () => {
    it("calls onNodeSelect when row is clicked", async () => {
      const user = userEvent.setup();
      const mockOnNodeSelect = jest.fn();
      render(<LineageTable {...defaultProps} onNodeSelect={mockOnNodeSelect} />);

      const rows = screen.getAllByRole("row");
      const firstDataRow = rows.find(row => row.textContent?.includes("token1"));

      if (firstDataRow) {
        await user.click(firstDataRow);
        expect(mockOnNodeSelect).toHaveBeenCalledWith("node1");
      }
    });

    it("highlights selected row", () => {
      render(<LineageTable {...defaultProps} selectedNodeId="node1" />);

      const rows = screen.getAllByRole("row");
      const selectedRow = rows.find(row => row.textContent?.includes("token1"));

      expect(selectedRow).toHaveClass("bg-muted");
    });

    it("does not call onNodeSelect when expand button is clicked", async () => {
      const user = userEvent.setup();
      const mockOnNodeSelect = jest.fn();
      render(<LineageTable {...defaultProps} onNodeSelect={mockOnNodeSelect} />);

      const expandButtons = screen.getAllByRole("button");
      const firstExpandButton = expandButtons.find(
        button => button.querySelector("svg") && button.className.includes("h-6 w-6"),
      );

      if (firstExpandButton) {
        await user.click(firstExpandButton);
        expect(mockOnNodeSelect).not.toHaveBeenCalled();
      }
    });

    it("works without onNodeSelect callback", async () => {
      const user = userEvent.setup();
      const { onNodeSelect, ...propsWithoutCallback } = defaultProps;

      render(<LineageTable {...propsWithoutCallback} />);

      const rows = screen.getAllByRole("row");
      const firstDataRow = rows.find(row => row.textContent?.includes("token1"));

      if (firstDataRow) {
        await user.click(firstDataRow);
        // Should not throw error
      }
    });
  });

  describe("Data Formatting", () => {
    it("formats timestamps correctly", () => {
      render(<LineageTable {...defaultProps} />);

      // Check that timestamps are formatted as locale strings
      const timestampCells = screen.getAllByText(/1\/1\/2022|1\/2\/2022|1\/3\/2022|1\/4\/2022/);
      expect(timestampCells.length).toBeGreaterThan(0);
    });

    it("formats values with locale formatting", () => {
      render(<LineageTable {...defaultProps} />);

      expect(screen.getByText("1,000")).toBeInTheDocument();
      expect(screen.getByText("500")).toBeInTheDocument();
      expect(screen.getByText("250")).toBeInTheDocument();
    });

    it("displays 'Root' for nodes without source", () => {
      render(<LineageTable {...defaultProps} />);

      const rows = screen.getAllByRole("row");
      const rootRow = rows.find(row => row.textContent?.includes("token1"));

      expect(rootRow).toHaveTextContent("Root");
    });

    it("displays source node IDs correctly", () => {
      render(<LineageTable {...defaultProps} />);

      const rows = screen.getAllByRole("row");
      const childRow = rows.find(row => row.textContent?.includes("token2"));

      expect(childRow).toHaveTextContent("node1");
    });

    it("formats metadata count correctly", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      // Enable metadata column
      const columnsButton = screen.getByText("Columns");
      await user.click(columnsButton);
      const metadataCheckbox = screen.getByText("Metadata");
      await user.click(metadataCheckbox);

      await waitFor(() => {
        expect(screen.getByText("2 fields")).toBeInTheDocument(); // node1 has 2 metadata fields
        expect(screen.getByText("1 fields")).toBeInTheDocument(); // node2 has 1 metadata field
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles empty lineage", () => {
      const emptyLineage: TokenLineage = {
        nodes: [],
        edges: [],
        rootTokenId: "",
      };

      render(<LineageTable {...defaultProps} lineage={emptyLineage} />);
      expect(screen.getByText("Showing 0 of 0 tokens")).toBeInTheDocument();
    });

    it("handles nodes without metadata", () => {
      const noMetadataNode: TokenLineageNode = {
        id: "node5",
        tokenId: "token5",
        generation: 0,
        timestamp: Date.now(),
        value: 100,
        operation: "mint",
      };

      const lineageWithNoMetadata: TokenLineage = {
        nodes: [noMetadataNode],
        edges: [],
        rootTokenId: "token5",
      };

      render(<LineageTable {...defaultProps} lineage={lineageWithNoMetadata} />);
      expect(screen.getByText("token5")).toBeInTheDocument();
    });

    it("handles missing optional props", () => {
      render(<LineageTable lineage={mockLineage} />);
      expect(screen.getByText("token1")).toBeInTheDocument();
    });

    it("handles nodes with empty operations", () => {
      const nodeWithEmptyOperation: TokenLineageNode = {
        id: "empty-op",
        tokenId: "EMPTY-OP",
        generation: 0,
        timestamp: Date.now(),
        value: 100,
        operation: "",
      };

      const lineageWithEmptyOperation: TokenLineage = {
        nodes: [nodeWithEmptyOperation],
        edges: [],
        rootTokenId: "EMPTY-OP",
      };

      render(<LineageTable {...defaultProps} lineage={lineageWithEmptyOperation} />);
      expect(screen.getByText("EMPTY-OP")).toBeInTheDocument();
    });

    it("handles very large values", () => {
      const nodeWithLargeValue: TokenLineageNode = {
        id: "large-value",
        tokenId: "LARGE-VALUE",
        generation: 0,
        timestamp: Date.now(),
        value: 1234567890123,
        operation: "mint",
      };

      const lineageWithLargeValue: TokenLineage = {
        nodes: [nodeWithLargeValue],
        edges: [],
        rootTokenId: "LARGE-VALUE",
      };

      render(<LineageTable {...defaultProps} lineage={lineageWithLargeValue} />);
      expect(screen.getByText("1,234,567,890,123")).toBeInTheDocument();
    });
  });
});
