"use client";

import React, { useState } from "react";
import LineageTable from "./LineageTable";
import { TokenLineage, TokenLineageNode } from "./types";

// Sample data for demonstration
const generateSampleData = (): TokenLineage => {
  const nodes: TokenLineageNode[] = [
    {
      id: "root-1",
      tokenId: "TOKEN-001",
      generation: 0,
      timestamp: Date.now() - 86400000 * 7, // 7 days ago
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
      timestamp: Date.now() - 86400000 * 6, // 6 days ago
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
      timestamp: Date.now() - 86400000 * 6, // 6 days ago
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
      timestamp: Date.now() - 86400000 * 4, // 4 days ago
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
      timestamp: Date.now() - 86400000 * 3, // 3 days ago
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
      timestamp: Date.now() - 86400000 * 3, // 3 days ago
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
      timestamp: Date.now() - 86400000 * 2, // 2 days ago
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
      timestamp: Date.now() - 86400000 * 1, // 1 day ago
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
      timestamp: Date.now() - 86400000 * 6,
    },
    {
      id: "edge-2",
      sourceId: "root-1",
      targetId: "split-2",
      operation: "split",
      timestamp: Date.now() - 86400000 * 6,
    },
    {
      id: "edge-3",
      sourceId: "split-1",
      targetId: "transfer-1",
      operation: "transfer",
      timestamp: Date.now() - 86400000 * 4,
    },
    {
      id: "edge-4",
      sourceId: "split-2",
      targetId: "burn-1",
      operation: "burn",
      timestamp: Date.now() - 86400000 * 3,
    },
    {
      id: "edge-5",
      sourceId: "split-2",
      targetId: "remaining-1",
      operation: "split",
      timestamp: Date.now() - 86400000 * 3,
    },
    {
      id: "edge-6",
      sourceId: "transfer-1",
      targetId: "merge-1",
      operation: "merge",
      timestamp: Date.now() - 86400000 * 2,
    },
    {
      id: "edge-7",
      sourceId: "merge-1",
      targetId: "stake-1",
      operation: "stake",
      timestamp: Date.now() - 86400000 * 1,
    },
  ];

  return {
    nodes,
    edges,
    rootTokenId: "TOKEN-001",
  };
};

const LineageTableDemo: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [lineageData] = useState<TokenLineage>(generateSampleData());

  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    console.log("Selected node:", nodeId);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Token Lineage Table Demo</h1>
        <p className="text-muted-foreground">
          Interactive demonstration of the LineageTable component with sorting, grouping, search, and expandable rows
          functionality.
        </p>
      </div>

      {selectedNodeId && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900">Selected Node</h3>
          <p className="text-blue-700">Node ID: {selectedNodeId}</p>
          <p className="text-sm text-blue-600">Click on any row to select a different token node.</p>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Features Demonstrated</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">🔍 Search & Filter</h3>
            <p className="text-sm text-muted-foreground">Search across all token properties including metadata</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">📊 Sorting</h3>
            <p className="text-sm text-muted-foreground">
              Click column headers to sort by generation, timestamp, value, or operation
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">📁 Grouping</h3>
            <p className="text-sm text-muted-foreground">Group tokens by generation, operation type, or source node</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">👁️ Column Visibility</h3>
            <p className="text-sm text-muted-foreground">Show/hide columns including metadata details</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">📖 Expandable Rows</h3>
            <p className="text-sm text-muted-foreground">Click the arrow buttons to view detailed token information</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">🎯 Row Selection</h3>
            <p className="text-sm text-muted-foreground">Click on rows to select tokens and trigger callbacks</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Interactive Table</h2>
        <p className="text-sm text-muted-foreground">Try the various controls to explore the token lineage data:</p>
      </div>

      <LineageTable lineage={lineageData} onNodeSelect={handleNodeSelect} selectedNodeId={selectedNodeId} />

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Sample Data Structure</h3>
        <p className="text-sm text-muted-foreground mb-2">
          This demo uses a sample token lineage with the following structure:
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>
            <strong>Generation 0:</strong> Initial mint token (TOKEN-001)
          </li>
          <li>
            <strong>Generation 1:</strong> Two split tokens (TOKEN-002, TOKEN-003)
          </li>
          <li>
            <strong>Generation 2:</strong> Transfer, burn, and remaining tokens
          </li>
          <li>
            <strong>Generation 3:</strong> Merged token combining previous tokens
          </li>
          <li>
            <strong>Generation 4:</strong> Staked token for yield generation
          </li>
        </ul>
      </div>
    </div>
  );
};

export default LineageTableDemo;
