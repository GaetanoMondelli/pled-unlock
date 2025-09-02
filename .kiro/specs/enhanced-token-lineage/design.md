# Enhanced Token Lineage Design

## Overview

The enhanced token lineage system will provide complete genealogical traceability for every token in the simulation, allowing users to trace any token back to its ultimate data source origins through all intermediate aggregations, transformations, and processing steps. The system will support both visual tree representations and tabular views for different analysis and documentation needs.

### Example: Complete Token History

For token `W8WbnEd0` (value: 316) from Output Queue D:

```
🎯 Target Token: W8WbnEd0 (value: 316)
├─ Operation: AGGREGATED_AVERAGE by Output Queue D
├─ Calculation: avg(165) = 165 (single token average)
├─ Source Token: JKL012 (value: 165) from Processor C
│  ├─ Operation: TRANSFORMATION by Processor C  
│  ├─ Formula: inputs.Queue_B.value + 10
│  ├─ Calculation: 155 + 10 = 165
│  ├─ Source Token: GHI789 (value: 155) from Queue B
│  │  ├─ Operation: AGGREGATED_SUM by Queue B
│  │  ├─ Calculation: sum(5, 150) = 155
│  │  ├─ Source Token: ABC123 (value: 5) from Source A
│  │  │  ├─ Operation: DATASOURCE_CREATION by Source A
│  │  │  └─ 🌱 ROOT: Created from nothing (DataSource)
│  │  └─ Source Token: DEF456 (value: 150) from Source X  
│  │     ├─ Operation: DATASOURCE_CREATION by Source X
│  │     └─ 🌱 ROOT: Created from nothing (DataSource)
│  └─ Complete History: [CREATED, ARRIVED_AT_PROCESSOR, CONSUMED_FOR_TRANSFORMATION]
└─ Complete History: [AGGREGATED_AVERAGE, PLACED_IN_OUTPUT, CONSUMED_BY_SINK]

🌱 Ultimate Sources: ABC123 (Source A, value: 5), DEF456 (Source X, value: 150)
📊 Source Contributions: Source A: 3.16% (5/158), Source X: 94.94% (150/158)
```

**Key Points:**
- DFS stops at DataSource tokens (ABC123, DEF456) - these are TRUE roots
- Every operation stores complete details: method, formula, calculation, source tokens
- Each source token includes its own complete recursive lineage
- Full history preserved for every token in the chain

### Visual Expandable Tree Example

```
🎯 W8WbnEd0 (316) - Output Queue D                    [Current Token]
├─ 📊 AGGREGATED_AVERAGE: avg(165) = 165              [Click to expand operation details]
└─ ⚙️ JKL012 (165) - Processor C                      [▼ Expanded]
   ├─ ⚙️ TRANSFORMATION: inputs.Queue_B.value + 10 = 155 + 10 = 165
   ├─ 📋 History: [CREATED, ARRIVED_AT_PROCESSOR, CONSUMED] [Click to expand]
   └─ 📊 GHI789 (155) - Queue B                       [▼ Expanded]
      ├─ 📊 AGGREGATED_SUM: sum(5, 150) = 155
      ├─ 📋 History: [AGGREGATED, PLACED_IN_OUTPUT, CONSUMED] [Click to expand]
      ├─ 🌱 ABC123 (5) - Source A                     [▶ Collapsed - Click to expand]
      └─ 🌱 DEF456 (150) - Source X                   [▼ Expanded]
         ├─ 🌱 DATASOURCE_CREATION: Created from nothing
         ├─ 📋 History: [CREATED, EMITTED, ARRIVED] [Click to expand]
         └─ 💡 ROOT TOKEN - No further ancestry

Interactive Features:
▼ = Expanded node (click to collapse)
▶ = Collapsed node (click to expand)  
🎯 = Current target token
🌱 = DataSource root token
⚙️ = ProcessNode transformation
📊 = Queue aggregation
📋 = Token history (expandable)
💡 = Additional info/metadata
```

### Tree Interaction Patterns

1. **Click Token**: Navigate to that token's detailed inspector
2. **Click ▼/▶**: Expand/collapse that branch
3. **Click Operation**: Show detailed calculation breakdown
4. **Click History**: Show complete event timeline for that token
5. **Hover**: Highlight contribution path and show quick info
6. **Right-click**: Context menu with export, copy, bookmark options

## Architecture

### Core Components

1. **TokenGenealogyEngine** - Core service for building complete token lineage trees
2. **LineageVisualization** - React components for visual tree representation
3. **LineageTable** - React components for tabular representation
4. **TokenNavigator** - Service for interactive navigation between related tokens
5. **LineageExporter** - Service for exporting lineage data in various formats
6. **Enhanced Token Inspector Modal** - Updated modal with new lineage capabilities

### Data Flow

```
Token Selection → TokenGenealogyEngine → LineageVisualization/LineageTable → User Interaction → TokenNavigator → Updated View
```

## Components and Interfaces

### TokenGenealogyEngine

**Purpose**: Build complete token genealogy trees by analyzing the global activity log and reconstructing the full ancestry chain using graph traversal algorithms.

**Algorithm**: The engine uses **Depth-First Search (DFS)** to traverse all paths from a target token back to its ultimate sources, and **Breadth-First Search (BFS)** for level-by-level generation analysis.

```typescript
interface TokenGenealogyEngine {
  buildCompleteLineage(tokenId: string, globalLog: HistoryEntry[]): TokenLineage;
  
  // DFS-based recursive ancestry traversal - STOPS at DataSource tokens (true roots)
  findAllAncestors(tokenId: string, globalLog: HistoryEntry[], visited?: Set<string>): AncestorToken[];
  
  // BFS-based level traversal for generation analysis
  findAncestorsByGeneration(tokenId: string, globalLog: HistoryEntry[]): Map<number, AncestorToken[]>;
  
  // Determine if a token is a TRUE root (created by DataSource, not derived from other tokens)
  isRootToken(tokenId: string, globalLog: HistoryEntry[]): boolean;
  
  // Build complete operation details including all source token histories
  buildOperationDetails(tokenId: string, globalLog: HistoryEntry[]): OperationInfo;
  
  // DFS for forward traversal to find descendants
  findAllDescendants(tokenId: string, globalLog: HistoryEntry[], visited?: Set<string>): DescendantToken[];
  
  // Calculate proportional contributions from all source paths
  calculateSourceContributions(tokenId: string, globalLog: HistoryEntry[]): SourceContribution[];
  
  // Build token dependency graph for efficient traversal
  buildTokenGraph(globalLog: HistoryEntry[]): TokenGraph;
}

interface TokenGraph {
  nodes: Map<string, TokenNode>;
  edges: Map<string, TokenEdge[]>;
  
  // Graph traversal methods
  dfsTraversal(startTokenId: string, direction: 'ancestors' | 'descendants'): string[];
  bfsTraversal(startTokenId: string, direction: 'ancestors' | 'descendants'): Map<number, string[]>;
  findAllPaths(fromTokenId: string, toTokenId: string): TokenPath[];
}

interface TokenNode {
  tokenId: string;
  value: any;
  createdAt: number;
  originNodeId: string;
  operation?: OperationInfo;
}

interface TokenEdge {
  fromTokenId: string;
  toTokenId: string;
  operation: OperationInfo;
  weight?: number; // for contribution calculations
}

interface TokenPath {
  tokens: string[];
  operations: OperationInfo[];
  totalContribution: number;
}

interface TokenLineage {
  targetToken: Token;
  immediateParents: ParentToken[];
  allAncestors: AncestorToken[];
  descendants: DescendantToken[];
  sourceContributions: SourceContribution[];
  generationLevels: GenerationLevel[];
}

interface AncestorToken {
  id: string;
  value: any;
  createdAt: number;
  originNodeId: string;
  generationLevel: number;
  isRoot: boolean; // TRUE only for DataSource tokens (created from nothing)
  operation?: OperationInfo;
  contributionPath: string[];
  completeHistory: HistoryEntry[]; // Full history of this specific token
}

interface OperationInfo {
  type: 'datasource_creation' | 'aggregation' | 'transformation';
  method?: string; // sum, average, count, first, last, or formula name
  sourceTokens: SourceTokenDetail[]; // Complete details of ALL input tokens
  formula?: string; // For ProcessNode transformations
  calculation?: string; // Human-readable calculation (e.g., "(5 + 7 + 9) / 3 = 7")
  aggregationDetails?: AggregationDetails;
}

interface SourceTokenDetail {
  tokenId: string;
  value: any;
  originNodeId: string;
  createdAt: number;
  completeLineage: AncestorToken[]; // RECURSIVE: full history of this source token
}

interface AggregationDetails {
  method: 'sum' | 'average' | 'count' | 'first' | 'last';
  inputTokens: Array<{
    tokenId: string;
    value: any;
    contribution: number; // For average: value/count, for sum: value/total, etc.
  }>;
  calculation: string; // e.g., "avg(5, 7, 9) = (5+7+9)/3 = 21/3 = 7"
  resultValue: any;
}

interface SourceContribution {
  sourceTokenId: string;
  sourceNodeId: string;
  originalValue: any;
  proportionalContribution: number;
  contributionPath: string[];
}

interface GenerationLevel {
  level: number;
  tokens: AncestorToken[];
  description: string;
}
```

### LineageVisualization Component

**Purpose**: Render interactive visual tree representation of token lineage with expandable nodes for detailed exploration.

```typescript
interface LineageVisualizationProps {
  lineage: TokenLineage;
  onTokenClick: (tokenId: string) => void;
  onExportRequest: (format: ExportFormat) => void;
  viewMode: 'tree' | 'graph' | 'timeline';
  showSourceContributions: boolean;
  initialExpandLevel: number; // Auto-expand to this level
}

interface InteractiveTreeNode {
  id: string;
  tokenId: string;
  label: string;
  value: any;
  nodeType: 'datasource' | 'queue' | 'processor' | 'sink' | 'current';
  children: InteractiveTreeNode[];
  operation?: OperationInfo;
  
  // Expansion state
  isExpanded: boolean;
  isExpandable: boolean;
  hasLoadedChildren: boolean;
  
  // Visual properties
  depth: number;
  visualStyle: TreeNodeStyle;
  connectionLines: ConnectionLine[];
  
  // Interactive features
  onExpand: () => void;
  onCollapse: () => void;
  onClick: () => void;
  onHover: (isHovering: boolean) => void;
}

interface TreeNodeStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  icon: string; // 🌱 for sources, ⚙️ for processors, 📊 for queues, 🎯 for current
  shape: 'rectangle' | 'circle' | 'diamond';
  size: 'small' | 'medium' | 'large';
}

interface ConnectionLine {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  style: 'solid' | 'dashed' | 'dotted';
  color: string;
  label?: string; // Operation type or contribution percentage
}

// Expandable Tree Component
interface ExpandableTokenTreeProps {
  rootToken: Token;
  lineage: TokenLineage;
  onNodeClick: (tokenId: string) => void;
  maxDepth?: number;
  showOperationDetails: boolean;
  showContributions: boolean;
}

// Tree Node Component with expansion controls
interface TokenTreeNodeProps {
  node: InteractiveTreeNode;
  depth: number;
  isLast: boolean;
  parentLines: boolean[];
  onToggleExpand: (nodeId: string) => void;
  onNodeClick: (tokenId: string) => void;
}
```

### Visual Tree Features

1. **Expandable Nodes**: Click to expand/collapse token histories
2. **Visual Hierarchy**: Clear parent-child relationships with connecting lines
3. **Operation Details**: Expandable sections showing formulas, calculations
4. **Source Highlighting**: Visual distinction for DataSource tokens (🌱)
5. **Contribution Indicators**: Visual representation of source contributions
6. **Interactive Navigation**: Click any token to navigate to its detailed view
7. **Zoom and Pan**: For large trees, support zooming and panning
8. **Minimap**: Overview of large tree structures

### Tree Visualization Modes

```typescript
type TreeVisualizationMode = 
  | 'compact'      // Minimal view, only token IDs and values
  | 'detailed'     // Full operation details visible
  | 'contributions' // Focus on source contributions
  | 'timeline'     // Chronological arrangement by creation time
  | 'operations';  // Group by operation types

interface TreeDisplayOptions {
  mode: TreeVisualizationMode;
  autoExpandToLevel: number;
  showOperationFormulas: boolean;
  showContributionPercentages: boolean;
  showTimestamps: boolean;
  showNodeNames: boolean;
  highlightSourcePaths: boolean;
}
```
```

### LineageTable Component

**Purpose**: Render tabular representation of token lineage for documentation and export.

```typescript
interface LineageTableProps {
  lineage: TokenLineage;
  onTokenClick: (tokenId: string) => void;
  sortBy: 'generation' | 'timestamp' | 'value' | 'node';
  groupBy: 'generation' | 'operation' | 'source';
  showColumns: TableColumn[];
}

interface LineageTableRow {
  tokenId: string;
  generation: number;
  timestamp: number;
  value: any;
  operation: string;
  sourceTokens: string[];
  originNode: string;
  contributionPath: string;
  isExpandable: boolean;
  children?: LineageTableRow[];
}

type TableColumn = 'generation' | 'timestamp' | 'tokenId' | 'value' | 'operation' | 'sourceTokens' | 'originNode' | 'contribution';
```

### TokenNavigator Service

**Purpose**: Handle navigation between related tokens while maintaining context.

```typescript
interface TokenNavigator {
  navigateToToken(tokenId: string, context: NavigationContext): void;
  navigateBack(): void;
  navigateForward(): void;
  getNavigationHistory(): NavigationHistoryEntry[];
  clearHistory(): void;
}

interface NavigationContext {
  sourceView: 'lineage' | 'inspector' | 'global-ledger';
  parentTokenId?: string;
  searchFilters?: LineageFilters;
  viewMode: 'visual' | 'tabular';
}

interface NavigationHistoryEntry {
  tokenId: string;
  timestamp: number;
  context: NavigationContext;
}
```

### LineageExporter Service

**Purpose**: Export lineage data in various formats for documentation and analysis.

```typescript
interface LineageExporter {
  exportToJSON(lineage: TokenLineage): string;
  exportToCSV(lineage: TokenLineage): string;
  exportToMermaidDiagram(lineage: TokenLineage): string;
  exportToMarkdownReport(lineage: TokenLineage): string;
}

interface ExportOptions {
  format: 'json' | 'csv' | 'mermaid' | 'markdown';
  includeSourceContributions: boolean;
  includeOperationDetails: boolean;
  maxGenerations?: number;
}
```

## Data Models

### Enhanced HistoryEntry

Extend the existing HistoryEntry to include more detailed lineage information:

```typescript
interface EnhancedHistoryEntry extends HistoryEntry {
  operationType: 'creation' | 'aggregation' | 'transformation' | 'consumption';
  aggregationDetails?: {
    method: string;
    inputCount: number;
    calculation: string;
  };
  transformationDetails?: {
    formula: string;
    inputMapping: Record<string, any>;
  };
  lineageMetadata?: {
    generationLevel: number;
    ultimateSources: string[];
  };
}
```

### TokenLineageCache

For performance optimization, implement caching of computed lineages:

```typescript
interface TokenLineageCache {
  get(tokenId: string): TokenLineage | null;
  set(tokenId: string, lineage: TokenLineage): void;
  invalidate(tokenId: string): void;
  clear(): void;
}
```

## Error Handling

### Lineage Computation Errors

1. **Circular Reference Detection**: Detect and handle circular references in token lineage using visited sets
2. **Missing Token Data**: Handle cases where referenced tokens are not found in the activity log
3. **Incomplete Lineage**: Handle cases where lineage chain is broken due to missing events
4. **Performance Limits**: Handle cases where lineage trees become too large to compute efficiently
5. **Root Detection Failure**: Handle cases where DFS cannot find true DataSource roots
6. **Operation Reconstruction Failure**: Handle cases where operation details cannot be fully reconstructed from logs

```typescript
interface LineageError {
  type: 'circular_reference' | 'missing_token' | 'incomplete_lineage' | 'performance_limit';
  tokenId: string;
  message: string;
  affectedTokens: string[];
  suggestedAction: string;
}
```

### Error Recovery Strategies

1. **Partial Lineage**: Show partial lineage with clear indication of missing parts
2. **Alternative Paths**: Show alternative lineage paths when primary path is broken
3. **Approximation**: Use approximation techniques for very large lineage trees
4. **User Notification**: Clear error messages with actionable suggestions

## Testing Strategy

### Unit Tests

1. **TokenGenealogyEngine Tests**
   - Test lineage building for simple chains (DataSource → Queue → Sink)
   - Test lineage building for complex aggregations (multiple sources → Queue → ProcessNode)
   - Test lineage building for multi-level processing chains
   - Test circular reference detection
   - Test performance with large lineage trees

2. **LineageVisualization Tests**
   - Test tree rendering for various lineage structures
   - Test interactive navigation between tokens
   - Test expansion/collapse of tree branches
   - Test visual styling for different operation types

3. **LineageTable Tests**
   - Test tabular rendering of lineage data
   - Test sorting and grouping functionality
   - Test column visibility controls
   - Test export functionality

### Integration Tests

1. **End-to-End Lineage Tracing**
   - Create complex simulation scenarios
   - Verify complete lineage tracing from sinks back to sources
   - Test lineage accuracy across different aggregation methods
   - Test lineage preservation through ProcessNode transformations

2. **Performance Tests**
   - Test lineage computation performance with large token counts
   - Test UI responsiveness with complex lineage trees
   - Test memory usage with deep lineage chains
   - Test caching effectiveness

### User Acceptance Tests

1. **Token Investigation Workflows**
   - User can trace any token back to its ultimate sources
   - User can understand the contribution of each source to aggregated values
   - User can navigate between related tokens efficiently
   - User can export lineage data for documentation

2. **Visual Representation Tests**
   - Visual tree clearly shows parent-child relationships
   - Different operation types are visually distinguishable
   - Complex lineages are manageable through expand/collapse
   - Tabular view provides comprehensive data for analysis

## Implementation Phases

### Phase 1: Core Lineage Engine
- Implement TokenGraph data structure for efficient graph representation
- Create DFS algorithm for recursive ancestry traversal with cycle detection
- Create BFS algorithm for level-by-level generation analysis
- Implement TokenGenealogyEngine with graph-based lineage building
- Add enhanced source token tracking to simulation store
- Implement circular reference detection using visited sets

### Phase 2: Visual Representation
- Create ExpandableTokenTree component with interactive nodes
- Implement expand/collapse functionality with lazy loading
- Add visual styling and icons for different node types (🌱⚙️📊🎯)
- Create connection lines and hierarchical layout
- Implement hover effects and interactive navigation
- Add zoom/pan capabilities for large trees

### Phase 3: Tabular View and Export
- Create LineageTable component with sorting and grouping
- Implement LineageExporter service
- Add export functionality for JSON, CSV, and Markdown
- Create Mermaid diagram generation

### Phase 4: Advanced Features
- Implement source contribution calculations
- Add lineage search and filtering
- Create navigation history and breadcrumbs
- Implement performance optimizations and caching

### Phase 5: Integration and Polish
- Integrate with existing Token Inspector Modal
- Add lineage features to Global Ledger Modal
- Implement comprehensive error handling
- Add user preferences for lineage display options

## Performance Considerations

### Optimization Strategies

1. **Graph Pre-computation**: Build the token dependency graph once and reuse for multiple lineage queries
2. **Memoized Traversal**: Cache DFS/BFS results to avoid re-traversing the same paths
3. **Pruning Strategies**: 
   - **Depth Limiting**: Limit DFS depth to prevent infinite recursion
   - **Cycle Detection**: Use visited sets to detect and break circular references
   - **Early Termination**: Stop traversal when reaching known source tokens
4. **Lazy Loading**: Load lineage data on-demand rather than pre-computing all lineages
5. **Incremental Updates**: Update the token graph incrementally as new events occur
6. **Background Computation**: Compute complex lineages in background workers using Web Workers
7. **Path Compression**: Compress long linear chains into single edges for faster traversal

### Memory Management

1. **Lineage Pruning**: Automatically prune very old or deep lineage data
2. **Selective Loading**: Load only relevant portions of lineage trees
3. **Garbage Collection**: Implement proper cleanup of cached lineage data
4. **Memory Monitoring**: Monitor memory usage and implement safeguards

## Security and Privacy

### Data Protection

1. **Sensitive Data Handling**: Ensure token values and lineage data are handled securely
2. **Export Controls**: Implement controls on what lineage data can be exported
3. **Access Controls**: Ensure only authorized users can access detailed lineage information

### Audit Trail

1. **Lineage Access Logging**: Log when users access detailed lineage information
2. **Export Tracking**: Track when lineage data is exported and by whom
3. **Modification History**: Track any modifications to lineage computation logic