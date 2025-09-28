# Node Grouping and Tagging System

The Template Editor now includes a comprehensive grouping and tagging system to manage visual complexity when dealing with many nodes.

## Features

### 1. **Node Tagging System**
- **Tag-based Categorization**: Assign multiple tags to nodes for better organization
- **Visual Tag Filtering**: Show/hide nodes based on active tag filters
- **Predefined Tag Library**: Common categories like "data-sources", "processing", "storage", "outputs"
- **Custom Tag Creation**: Create custom tags with colors and descriptions

### 2. **Node Grouping System**
- **Visual Groups**: Group related nodes into collapsible containers
- **Smart I/O Management**: Automatically compute group inputs/outputs from contained nodes
- **Expand/Collapse**: Double-click groups to expand or collapse them
- **Group Hierarchy**: Groups can contain multiple nodes while maintaining connections

### 3. **Three View Modes**

#### **All Nodes Mode**
- Shows all nodes in the diagram
- Default view for full system visibility
- No filtering applied

#### **Grouped Mode**
- Shows group nodes and ungrouped nodes
- Collapsed groups hide contained nodes
- Maintains connection flow through group boundaries

#### **Filtered Mode**  
- Shows only nodes matching active tag filters
- Perfect for focusing on specific subsystems
- Groups are always visible for context

## Usage Guide

### Creating Tags

1. **Open Groups Panel**: Click View → Groups & Tags or use the Groups panel toggle
2. **Add Tag**: Click the + button next to Tags
3. **Configure Tag**: Set name, description, and color
4. **Apply to Nodes**: Edit nodes to assign tags

### Creating Groups

1. **Select Nodes**: Choose nodes to group together
2. **Create Group**: Click + next to Groups in the panel
3. **Configure Group**: Set name, description, and color  
4. **Select Nodes**: Check nodes to include in the group
5. **Create**: The group will appear with computed I/O connections

### Managing Groups

- **Expand/Collapse**: Double-click group nodes
- **Edit Properties**: Use the group management panel
- **Delete Groups**: Use Delete key (contained nodes remain)

### Filtering by Tags

1. **Enable Filters**: Check tags in the Groups panel
2. **View Updates**: Only nodes with selected tags are shown
3. **Clear Filters**: Uncheck all tags to return to full view

## Technical Implementation

### Schema Extensions

```typescript
// Node schema now supports tags and grouping
const BaseNodeSchema = z.object({
  nodeId: z.string(),
  displayName: z.string(),
  position: PositionSchema,
  tags: z.array(z.string()).optional(),
  groupId: z.string().optional(),
  isCollapsed: z.boolean().optional(),
});

// New GroupNode type
export const GroupNodeSchema = BaseNodeSchema.extend({
  type: z.literal("Group"),
  groupName: z.string(),
  groupColor: z.string().default("#6366f1"),
  containedNodes: z.array(z.string()),
  // ... additional properties
});

// Scenario-level group configuration
groups: {
  tags: Array<{name, color, description}>,
  visualMode: "all" | "grouped" | "filtered", 
  activeFilters: string[]
}
```

### Key Components

- **`GroupNodeDisplay`**: React component for rendering group nodes
- **`GroupManagementPanel`**: UI for managing tags and groups
- **`groupingUtils`**: Utility functions for group operations
- **Enhanced `GraphVisualization`**: Updated to support filtering and grouping

### Smart Features

1. **Automatic I/O Detection**: Groups automatically detect input/output connections
2. **Connection Preservation**: Grouping maintains all node connections
3. **Visual Feedback**: Active nodes and animated edges work within groups
4. **Keyboard Shortcuts**: Standard shortcuts work in grouped views
5. **Drag & Drop**: Works seamlessly with grouped nodes

## Examples

### Example 1: Data Pipeline Grouping
```json
{
  "nodeId": "group_pipeline",
  "type": "Group", 
  "groupName": "Data Processing Pipeline",
  "containedNodes": ["source1", "processor1", "queue1"],
  "tags": ["pipeline"]
}
```

### Example 2: Tag-based Filtering
```json
{
  "groups": {
    "tags": [
      {"name": "ml-models", "color": "#8b5cf6"},
      {"name": "data-prep", "color": "#22c55e"}
    ],
    "activeFilters": ["ml-models"]
  }
}
```

## Benefits

### **Visual Clarity**
- Reduce visual clutter with many nodes
- Focus on relevant subsystems
- Hierarchical organization

### **Better Workflow**
- Logical grouping of related functionality
- Easy navigation in complex diagrams
- Professional presentation

### **Scalability**
- Handle large, complex workflows
- Maintain performance with many nodes
- Organized development process

### **Collaboration**
- Clear subsystem boundaries
- Consistent categorization
- Self-documenting workflows

## Best Practices

1. **Consistent Tagging**: Use standardized tag names across projects
2. **Meaningful Groups**: Group functionally related nodes
3. **Color Coding**: Use consistent colors for similar concepts
4. **Descriptive Names**: Use clear, descriptive names for groups and tags
5. **Logical Hierarchy**: Avoid over-nesting groups

## Future Enhancements

- **Nested Groups**: Groups within groups for complex hierarchies
- **Group Templates**: Reusable group patterns
- **Auto-grouping**: AI-suggested groupings based on connectivity
- **Export Groups**: Export groups as reusable modules
- **Group Analytics**: Performance metrics at group level

This grouping system transforms the Template Editor from a node-based tool into a scalable, professional workflow design platform that can handle complexity while maintaining clarity.