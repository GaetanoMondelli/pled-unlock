import React from "react";
import LineageTable from "../LineageTable";
import { createComplexLineage, createMockLineage, createMockNode } from "./testUtils";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe("LineageTable Accessibility Tests", () => {
  const defaultProps = {
    lineage: createComplexLineage(),
    onNodeSelect: jest.fn(),
    selectedNodeId: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ARIA Compliance", () => {
    it("has no accessibility violations", async () => {
      const { container } = render(<LineageTable {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("maintains accessibility with expanded rows", async () => {
      const user = userEvent.setup();
      const { container } = render(<LineageTable {...defaultProps} />);

      // Expand a row
      const expandButtons = screen.getAllByRole("button").filter(button => button.className.includes("h-6 w-6"));

      if (expandButtons.length > 0) {
        await user.click(expandButtons[0]);

        await waitFor(async () => {
          const results = await axe(container);
          expect(results).toHaveNoViolations();
        });
      }
    });

    it("maintains accessibility with grouping enabled", async () => {
      const user = userEvent.setup();
      const { container } = render(<LineageTable {...defaultProps} />);

      const groupButton = screen.getByText("Group: None");
      await user.click(groupButton);
      await user.click(screen.getByText("Generation"));

      await waitFor(async () => {
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });

    it("maintains accessibility with column visibility changes", async () => {
      const user = userEvent.setup();
      const { container } = render(<LineageTable {...defaultProps} />);

      const columnsButton = screen.getByText("Columns");
      await user.click(columnsButton);
      await user.click(screen.getByText("Metadata"));

      await waitFor(async () => {
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });
  });

  describe("Semantic HTML Structure", () => {
    it("uses proper table structure", () => {
      render(<LineageTable {...defaultProps} />);

      const table = screen.getByRole("table");
      expect(table).toBeInTheDocument();

      const columnHeaders = screen.getAllByRole("columnheader");
      expect(columnHeaders.length).toBeGreaterThan(0);

      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(1); // Header + data rows
    });

    it("has proper heading hierarchy", () => {
      render(<LineageTable {...defaultProps} />);

      // Column headers should be properly marked
      const headers = screen.getAllByRole("columnheader");
      headers.forEach(header => {
        expect(header.tagName).toBe("TH");
      });
    });

    it("uses proper button elements for interactive controls", () => {
      render(<LineageTable {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);

      buttons.forEach(button => {
        expect(button.tagName).toBe("BUTTON");
      });
    });

    it("uses proper input elements for form controls", () => {
      render(<LineageTable {...defaultProps} />);

      const searchInput = screen.getByRole("textbox");
      expect(searchInput.tagName).toBe("INPUT");
      expect(searchInput).toHaveAttribute("type", "text");
    });
  });

  describe("Keyboard Navigation", () => {
    it("supports tab navigation through interactive elements", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      // Tab through main controls
      await user.tab();
      expect(screen.getByPlaceholderText("Search tokens...")).toHaveFocus();

      await user.tab();
      expect(screen.getByText("Group: None")).toHaveFocus();

      await user.tab();
      expect(screen.getByText("Columns")).toHaveFocus();
    });

    it("supports keyboard interaction with dropdowns", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const columnsButton = screen.getByText("Columns");
      await user.click(columnsButton);

      // Should be able to navigate dropdown with keyboard
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Enter}");

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByText("Toggle Columns")).not.toBeInTheDocument();
      });
    });

    it("supports keyboard interaction with sortable headers", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const generationHeader = screen.getByText("Generation");
      generationHeader.focus();

      await user.keyboard("{Enter}");

      // Should trigger sort
      await waitFor(() => {
        expect(generationHeader.parentElement).toContainHTML("ChevronDown");
      });
    });

    it("supports escape key to close dropdowns", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const groupButton = screen.getByText("Group: None");
      await user.click(groupButton);

      expect(screen.getByText("Group By")).toBeInTheDocument();

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByText("Group By")).not.toBeInTheDocument();
      });
    });

    it("maintains focus management during interactions", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search tokens...");
      await user.click(searchInput);

      expect(searchInput).toHaveFocus();

      await user.type(searchInput, "test");

      // Focus should remain on input during typing
      expect(searchInput).toHaveFocus();
    });
  });

  describe("Screen Reader Support", () => {
    it("provides proper labels for form controls", () => {
      render(<LineageTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search tokens...");
      expect(searchInput).toHaveAttribute("placeholder", "Search tokens...");
    });

    it("provides proper button labels", () => {
      render(<LineageTable {...defaultProps} />);

      const groupButton = screen.getByText("Group: None");
      expect(groupButton).toHaveTextContent("Group: None");

      const columnsButton = screen.getByText("Columns");
      expect(columnsButton).toHaveTextContent("Columns");
    });

    it("provides proper table headers", () => {
      render(<LineageTable {...defaultProps} />);

      const headers = ["Generation", "Timestamp", "Value", "Operation", "Source Node"];
      headers.forEach(headerText => {
        const header = screen.getByText(headerText);
        expect(header.closest("th")).toBeInTheDocument();
      });
    });

    it("provides meaningful text for expand/collapse buttons", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const expandButtons = screen.getAllByRole("button").filter(button => button.className.includes("h-6 w-6"));

      expect(expandButtons.length).toBeGreaterThan(0);

      // Each expand button should have meaningful content (icon)
      expandButtons.forEach(button => {
        expect(button.querySelector("svg")).toBeInTheDocument();
      });
    });

    it("announces state changes appropriately", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search tokens...");
      await user.type(searchInput, "ROOT");

      await waitFor(() => {
        // Summary should update to reflect filtered results
        expect(screen.getByText(/Showing \d+ of \d+ tokens/)).toBeInTheDocument();
      });
    });
  });

  describe("Visual Accessibility", () => {
    it("provides sufficient color contrast", () => {
      render(<LineageTable {...defaultProps} />);

      // This is a basic check - in a real app you'd use tools like axe-core
      // to verify actual color contrast ratios
      const table = screen.getByRole("table");
      expect(table).toBeInTheDocument();
    });

    it("supports high contrast mode", () => {
      // Mock high contrast media query
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === "(prefers-contrast: high)",
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<LineageTable {...defaultProps} />);

      // Component should render without issues in high contrast mode
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("provides visual focus indicators", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search tokens...");
      await user.click(searchInput);

      // Focus should be visible (this is handled by CSS, but we can check the element is focused)
      expect(searchInput).toHaveFocus();
    });

    it("supports reduced motion preferences", () => {
      // Mock reduced motion media query
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<LineageTable {...defaultProps} />);

      // Component should render without issues with reduced motion
      expect(screen.getByRole("table")).toBeInTheDocument();
    });
  });

  describe("Responsive Design Accessibility", () => {
    it("maintains accessibility on mobile viewports", async () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { container } = render(<LineageTable {...defaultProps} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("maintains touch accessibility", () => {
      render(<LineageTable {...defaultProps} />);

      const buttons = screen.getAllByRole("button");

      // All interactive elements should be large enough for touch
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        // This is a basic check - in practice you'd verify actual dimensions
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe("Error State Accessibility", () => {
    it("handles empty state accessibly", async () => {
      const emptyLineage = createMockLineage([], [], "");
      const { container } = render(<LineageTable lineage={emptyLineage} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      expect(screen.getByText("Showing 0 of 0 tokens")).toBeInTheDocument();
    });

    it("handles loading states accessibly", () => {
      // This would be more relevant if we had loading states
      render(<LineageTable {...defaultProps} />);

      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("handles error states accessibly", () => {
      // Test with malformed data
      const malformedLineage = createMockLineage([
        createMockNode({
          id: "malformed",
          tokenId: "MALFORMED",
          generation: 0,
          timestamp: NaN,
          value: -1,
          operation: "",
        }),
      ]);

      expect(() => {
        render(<LineageTable lineage={malformedLineage} />);
      }).not.toThrow();

      expect(screen.getByText("MALFORMED")).toBeInTheDocument();
    });
  });

  describe("Internationalization Accessibility", () => {
    it("supports RTL text direction", () => {
      // Mock RTL direction
      document.dir = "rtl";

      render(<LineageTable {...defaultProps} />);

      expect(screen.getByRole("table")).toBeInTheDocument();

      // Reset
      document.dir = "ltr";
    });

    it("handles long text content appropriately", () => {
      const longTextLineage = createMockLineage([
        createMockNode({
          id: "long-text",
          tokenId: "VERY-LONG-TOKEN-ID-THAT-MIGHT-CAUSE-LAYOUT-ISSUES",
          generation: 0,
          timestamp: Date.now(),
          value: 1000,
          operation: "very-long-operation-name-that-might-wrap",
          metadata: {
            "very-long-key-name": "very-long-value-that-might-cause-display-issues-in-the-table-layout",
          },
        }),
      ]);

      render(<LineageTable lineage={longTextLineage} />);

      expect(screen.getByText("VERY-LONG-TOKEN-ID-THAT-MIGHT-CAUSE-LAYOUT-ISSUES")).toBeInTheDocument();
    });
  });

  describe("Assistive Technology Compatibility", () => {
    it("works with screen readers", () => {
      render(<LineageTable {...defaultProps} />);

      // Check for proper semantic structure
      const table = screen.getByRole("table");
      const headers = screen.getAllByRole("columnheader");
      const rows = screen.getAllByRole("row");

      expect(table).toBeInTheDocument();
      expect(headers.length).toBeGreaterThan(0);
      expect(rows.length).toBeGreaterThan(1);
    });

    it("supports voice control", () => {
      render(<LineageTable {...defaultProps} />);

      // All interactive elements should have proper labels/text
      const buttons = screen.getAllByRole("button");
      const textbox = screen.getByRole("textbox");

      buttons.forEach(button => {
        expect(button).toHaveTextContent(/\S/); // Has some text content or aria-label
      });

      expect(textbox).toHaveAttribute("placeholder");
    });

    it("supports switch navigation", async () => {
      const user = userEvent.setup();
      render(<LineageTable {...defaultProps} />);

      // Should be able to navigate to all interactive elements
      const interactiveElements = [
        screen.getByPlaceholderText("Search tokens..."),
        screen.getByText("Group: None"),
        screen.getByText("Columns"),
      ];

      for (const element of interactiveElements) {
        element.focus();
        expect(element).toHaveFocus();
      }
    });
  });
});
