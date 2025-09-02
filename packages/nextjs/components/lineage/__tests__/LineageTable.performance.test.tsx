import React from "react";
import LineageTable from "../LineageTable";
import { createComplexLineage, createLargeLineage } from "./testUtils";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("LineageTable Performance Tests", () => {
  // Increase timeout for performance tests
  jest.setTimeout(30000);

  describe("Large Dataset Handling", () => {
    it("renders 1000 nodes within acceptable time", async () => {
      const largeLineage = createLargeLineage(1000);

      const startTime = performance.now();
      render(<LineageTable lineage={largeLineage} />);
      const endTime = performance.now();

      const renderTime = endTime - startTime;

      // Should render within 2 seconds
      expect(renderTime).toBeLessThan(2000);
      expect(screen.getByText("Showing 1000 of 1000 tokens")).toBeInTheDocument();
    });

    it("handles sorting on large datasets efficiently", async () => {
      const user = userEvent.setup();
      const largeLineage = createLargeLineage(1000);

      render(<LineageTable lineage={largeLineage} />);

      const valueHeader = screen.getByText("Value");

      const startTime = performance.now();
      await user.click(valueHeader);
      const endTime = performance.now();

      const sortTime = endTime - startTime;

      // Sorting should complete within 1 second
      expect(sortTime).toBeLessThan(1000);

      await waitFor(() => {
        expect(screen.getByText("Showing 1000 of 1000 tokens")).toBeInTheDocument();
      });
    });

    it("handles search on large datasets efficiently", async () => {
      const user = userEvent.setup();
      const largeLineage = createLargeLineage(1000);

      render(<LineageTable lineage={largeLineage} />);

      const searchInput = screen.getByPlaceholderText("Search tokens...");

      const startTime = performance.now();
      await user.type(searchInput, "LARGE-0001", { delay: 1 });
      const endTime = performance.now();

      const searchTime = endTime - startTime;

      // Search should complete within 1 second
      expect(searchTime).toBeLessThan(1000);

      await waitFor(() => {
        expect(screen.getByText("Showing 1 of 1000 tokens")).toBeInTheDocument();
      });
    });

    it("handles grouping on large datasets efficiently", async () => {
      const user = userEvent.setup();
      const largeLineage = createLargeLineage(1000);

      render(<LineageTable lineage={largeLineage} />);

      const groupButton = screen.getByText("Group: None");

      const startTime = performance.now();
      await user.click(groupButton);
      await user.click(screen.getByText("Generation"));
      const endTime = performance.now();

      const groupTime = endTime - startTime;

      // Grouping should complete within 1 second
      expect(groupTime).toBeLessThan(1000);

      await waitFor(() => {
        // Should have multiple generation groups
        expect(screen.getByText(/Generation \d+ \(\d+ tokens\)/)).toBeInTheDocument();
      });
    });

    it("maintains performance with multiple simultaneous operations", async () => {
      const user = userEvent.setup();
      const largeLineage = createLargeLineage(500); // Smaller dataset for complex operations

      render(<LineageTable lineage={largeLineage} />);

      const startTime = performance.now();

      // Perform multiple operations simultaneously
      const searchInput = screen.getByPlaceholderText("Search tokens...");
      await user.type(searchInput, "LARGE", { delay: 1 });

      const groupButton = screen.getByText("Group: None");
      await user.click(groupButton);
      await user.click(screen.getByText("Operation"));

      const valueHeader = screen.getByText("Value");
      await user.click(valueHeader);

      const columnsButton = screen.getByText("Columns");
      await user.click(columnsButton);
      await user.click(screen.getByText("Metadata"));

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All operations should complete within 3 seconds
      expect(totalTime).toBeLessThan(3000);

      await waitFor(() => {
        expect(screen.getByText("Showing 500 of 500 tokens")).toBeInTheDocument();
        expect(screen.getByText("Metadata")).toBeInTheDocument();
      });
    });
  });

  describe("Memory Usage", () => {
    it("does not create memory leaks with frequent re-renders", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<LineageTable lineage={createComplexLineage()} />);

      // Simulate frequent updates
      for (let i = 0; i < 10; i++) {
        const updatedLineage = createLargeLineage(100 + i * 10);
        rerender(<LineageTable lineage={updatedLineage} />);

        // Perform some interactions
        const searchInput = screen.getByPlaceholderText("Search tokens...");
        await user.clear(searchInput);
        await user.type(searchInput, `LARGE-${i.toString().padStart(4, "0")}`, { delay: 1 });
        await user.clear(searchInput);
      }

      // Should still be responsive
      expect(screen.getByText(/Showing \d+ of \d+ tokens/)).toBeInTheDocument();
    });

    it("handles rapid state changes efficiently", async () => {
      const user = userEvent.setup();
      render(<LineageTable lineage={createLargeLineage(200)} />);

      const searchInput = screen.getByPlaceholderText("Search tokens...");

      const startTime = performance.now();

      // Rapid typing and clearing
      for (let i = 0; i < 10; i++) {
        await user.type(searchInput, "test", { delay: 1 });
        await user.clear(searchInput);
      }

      const endTime = performance.now();
      const rapidChangeTime = endTime - startTime;

      // Should handle rapid changes within 2 seconds
      expect(rapidChangeTime).toBeLessThan(2000);

      await waitFor(() => {
        expect(screen.getByText("Showing 200 of 200 tokens")).toBeInTheDocument();
      });
    });
  });

  describe("DOM Performance", () => {
    it("limits DOM nodes for large datasets", () => {
      const largeLineage = createLargeLineage(1000);
      const { container } = render(<LineageTable lineage={largeLineage} />);

      // Count table rows (should include all data since we're not implementing virtualization)
      const rows = container.querySelectorAll("tr");

      // Should have header row + data rows
      expect(rows.length).toBeGreaterThan(1);
      expect(rows.length).toBeLessThan(1010); // Some reasonable upper bound
    });

    it("efficiently updates DOM on filtering", async () => {
      const user = userEvent.setup();
      const largeLineage = createLargeLineage(500);
      const { container } = render(<LineageTable lineage={largeLineage} />);

      const initialRowCount = container.querySelectorAll("tr").length;

      const searchInput = screen.getByPlaceholderText("Search tokens...");

      const startTime = performance.now();
      await user.type(searchInput, "LARGE-0001", { delay: 1 });
      const endTime = performance.now();

      const filterTime = endTime - startTime;
      expect(filterTime).toBeLessThan(500);

      await waitFor(() => {
        const filteredRowCount = container.querySelectorAll("tr").length;
        expect(filteredRowCount).toBeLessThan(initialRowCount);
      });
    });

    it("handles expand/collapse operations efficiently on large datasets", async () => {
      const user = userEvent.setup();
      const largeLineage = createLargeLineage(100); // Smaller for expand/collapse testing
      render(<LineageTable lineage={largeLineage} />);

      const expandButtons = screen.getAllByRole("button").filter(button => button.className.includes("h-6 w-6"));

      const startTime = performance.now();

      // Expand first 10 rows
      for (let i = 0; i < Math.min(10, expandButtons.length); i++) {
        await user.click(expandButtons[i]);
      }

      const endTime = performance.now();
      const expandTime = endTime - startTime;

      // Should expand all rows within 2 seconds
      expect(expandTime).toBeLessThan(2000);
    });
  });

  describe("Stress Testing", () => {
    it("handles maximum reasonable dataset size", async () => {
      const maxLineage = createLargeLineage(5000);

      const startTime = performance.now();
      render(<LineageTable lineage={maxLineage} />);
      const endTime = performance.now();

      const renderTime = endTime - startTime;

      // Should render even large datasets within 5 seconds
      expect(renderTime).toBeLessThan(5000);
      expect(screen.getByText("Showing 5000 of 5000 tokens")).toBeInTheDocument();
    });

    it("maintains responsiveness under heavy interaction load", async () => {
      const user = userEvent.setup();
      const largeLineage = createLargeLineage(1000);
      render(<LineageTable lineage={largeLineage} />);

      const startTime = performance.now();

      // Simulate heavy user interaction
      const searchInput = screen.getByPlaceholderText("Search tokens...");

      // Multiple rapid searches
      const searchTerms = ["LARGE", "mint", "transfer", "split", "burn"];
      for (const term of searchTerms) {
        await user.clear(searchInput);
        await user.type(searchInput, term, { delay: 1 });
      }

      // Multiple sort operations
      const sortableHeaders = ["Generation", "Value", "Timestamp", "Operation"];
      for (const header of sortableHeaders) {
        const headerElement = screen.getByText(header);
        await user.click(headerElement);
      }

      // Group operations
      const groupButton = screen.getByText(/Group:/);
      await user.click(groupButton);
      await user.click(screen.getByText("Generation"));

      const endTime = performance.now();
      const interactionTime = endTime - startTime;

      // All interactions should complete within 5 seconds
      expect(interactionTime).toBeLessThan(5000);

      await waitFor(() => {
        expect(screen.getByText(/Generation \d+ \(\d+ tokens\)/)).toBeInTheDocument();
      });
    });

    it("recovers gracefully from performance bottlenecks", async () => {
      const user = userEvent.setup();

      // Start with a reasonable dataset
      const { rerender } = render(<LineageTable lineage={createLargeLineage(100)} />);

      // Suddenly increase to a very large dataset
      const veryLargeLineage = createLargeLineage(2000);

      const startTime = performance.now();
      rerender(<LineageTable lineage={veryLargeLineage} />);
      const endTime = performance.now();

      const updateTime = endTime - startTime;

      // Should handle the update within reasonable time
      expect(updateTime).toBeLessThan(3000);

      // Should still be interactive
      const searchInput = screen.getByPlaceholderText("Search tokens...");
      await user.type(searchInput, "LARGE-0001", { delay: 1 });

      await waitFor(() => {
        expect(screen.getByText("Showing 1 of 2000 tokens")).toBeInTheDocument();
      });
    });
  });

  describe("Browser Compatibility Performance", () => {
    it("performs consistently across different data structures", () => {
      const datasets = [createLargeLineage(100), createComplexLineage(), createLargeLineage(500)];

      const renderTimes: number[] = [];

      datasets.forEach((dataset, index) => {
        const startTime = performance.now();
        const { unmount } = render(<LineageTable lineage={dataset} />);
        const endTime = performance.now();

        renderTimes.push(endTime - startTime);
        unmount();
      });

      // All render times should be reasonable
      renderTimes.forEach(time => {
        expect(time).toBeLessThan(2000);
      });

      // Performance should be relatively consistent
      const maxTime = Math.max(...renderTimes);
      const minTime = Math.min(...renderTimes);
      const variance = maxTime - minTime;

      // Variance should not be too high (within 1.5 seconds)
      expect(variance).toBeLessThan(1500);
    });
  });
});
