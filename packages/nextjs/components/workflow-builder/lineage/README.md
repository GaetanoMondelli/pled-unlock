# Token Lineage Components

This directory contains components for visualizing and interacting with token lineage data within the workflow builder context.

## Components

- **LineageTable** - Tabular representation of token lineage with sorting and filtering
- **D3TokenTree** - Interactive D3-based tree visualization with zoom and pan
- **CompactTokenTree** - Compact ASCII-style tree view for space-constrained displays
- **ExpandableTokenTree** - Expandable tree component with lazy loading and detailed node information

## Usage

```typescript
import { LineageTable, D3TokenTree, CompactTokenTree, ExpandableTokenTree } from "@/components/workflow-builder/lineage";

// Use with TokenLineage data from the simulation engine
<D3TokenTree 
  lineage={tokenLineage} 
  onTokenClick={handleTokenClick} 
/>
```

## Integration

These components are designed to work with:
- `TokenGenealogyEngine` for building lineage data
- `TokenLineage` types from the simulation system
- Workflow builder context for token tracking and navigation

## Location Note

These components were moved from `components/lineage/` to `components/workflow-builder/lineage/` to better reflect their role in the workflow building and token tracking system.