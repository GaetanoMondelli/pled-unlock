# How to Test the New Grouping System

## Step-by-Step Demo

### 1. **Start with the Template Editor**
- Open `/template-editor` in your browser
- You should see the interface with the new grouping system integrated

### 2. **Create Some Nodes with Tags**

#### Option A: Use Node Inspector (Recommended)
1. **Add some nodes** to the canvas (drag from Library panel)
2. **Click on a node** to open the Node Inspector
3. **Go to Overview tab** - you'll see a new "Tags" section
4. **Click the + button** next to "Tags"
5. **Type a tag name** (e.g., "data-processing", "output-stage", "input-layer")
6. **Hit Enter or click Add**
7. **Repeat for other nodes** - give some nodes the same tags

#### Option B: Use Groups Panel
1. **Click the "Groups" tab** in the right panel
2. **Click the + button** to create a new tag
3. **Enter tag name** and click Create
4. **Assign tags to nodes** via Node Inspector

### 3. **Test Automatic Grouping**

1. **Go to Groups panel** (right sidebar, "Groups" tab)
2. **You should see "Detectable Groups"** showing groups that can be created
3. **Toggle "Automatic Grouping"** switch to ON
4. **Watch magic happen!** Nodes with same tags will be grouped
5. **Click on a group** to explore its contents

### 4. **Test Breadcrumb Navigation**

1. **With grouping enabled**, click on any group node
2. **See breadcrumb navigation** appear at the top
3. **Navigate**: Template → Group Name → (Future: FSM states)
4. **Use back button** or click breadcrumbs to navigate
5. **Toggle between grouped/ungrouped views**

## What You'll See

### ✅ **Tags Section in Node Inspector**
- Add/remove tags from any node
- See existing tags from other nodes
- Create new tags on the fly

### ✅ **Automatic Group Detection**
- Groups panel shows detectable groups
- Counts nodes and input/output connections
- Preview before enabling grouping

### ✅ **Smart Grouping**
- Groups only created when 2+ nodes share tags
- External connections are consolidated
- Internal connections are hidden

### ✅ **Breadcrumb Navigation**
- Template_name/group_name navigation
- Context switching between views
- Back navigation and jumping

### ✅ **Clean Visual Interface**
- Groups show external I/O only
- Click to expand/explore
- Toggle grouped/ungrouped views

## Troubleshooting

### "No groups detected"
- Make sure you have nodes with matching tags
- Need at least 2 nodes with the same tag
- Check the Tags section in Node Inspector

### "Grouping toggle doesn't work"
- Check browser console for errors
- Make sure you have valid scenarios loaded
- Try refreshing the page

### "Tags not saving"
- Tags are saved immediately when added
- Check that the scenario is properly loaded
- Look for success/error toasts

## Example Workflow

1. **Create 4 nodes**: 2 DataSources, 1 Queue, 1 Sink
2. **Tag the DataSources**: Both get tag "input-layer"
3. **Tag Queue and Sink**: Both get tag "processing-layer"
4. **Enable grouping**: Should create 2 groups
5. **Click on input-layer group**: See breadcrumb "Template / input-layer"
6. **Explore the group**: See only DataSource nodes + external connections
7. **Navigate back**: Use breadcrumb or back button

## Future Extensions

The system is ready for:

### **FSM State Exploration**
```
Template → FSM_Node → State_View
```

Where State_View shows:
- FSM states as nodes
- Transitions as edges
- Current state highlighting
- Transition conditions

### **Multi-level Grouping**
- Groups within groups
- Hierarchical navigation
- Complex template organization

The foundation is solid! 🎉