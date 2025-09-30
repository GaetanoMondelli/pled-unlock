# Group Dragging Test Guide

## Issues Fixed

### ✅ **Issue 1: Group Toggle States Not Saved**
- **Problem**: When you reload, enabled tag groups were lost
- **Solution**: Now saves `enabledTagGroups` array to `scenario.groups.enabledTagGroups`
- **Test**: Enable some groups → reload → groups should still be enabled

### ✅ **Issue 2: Group Node Dragging Snaps Back**
- **Problem**: Group nodes return to center after dragging
- **Solution**: Added special handling in `onNodeDragStop` for Group nodes
- **Storage**: Group positions saved to `scenario.groups.groupPositions[tagName]`

## How to Test

### **Step 1: Create Test Setup**
1. Add some nodes to canvas (DataSource, Queue, Sink)
2. Add tags to nodes:
   - Select node → Node Inspector → Tags section
   - Add tags like "input-layer", "processing", etc.
   - Make sure 2+ nodes share the same tag

### **Step 2: Test Group Toggle Persistence**
1. Go to Groups panel → See "Detectable Groups"
2. Toggle ON specific groups using individual switches
3. Reload the page
4. ✅ **Expected**: Same groups should still be enabled

### **Step 3: Test Group Dragging**
1. With groups enabled, you should see group nodes on canvas
2. Try dragging a group node to a new position
3. Check browser console for debug logs:
   ```
   Group node drag detected: group_input-layer input-layer
   Saving group position: input-layer {x: 123, y: 456}
   Creating group "input-layer": {storedPosition: {x: 123, y: 456}, ...}
   ```
4. ✅ **Expected**: Group stays where you drag it

### **Step 4: Test Position Persistence**
1. Drag group to new position
2. Toggle grouping OFF then ON
3. ✅ **Expected**: Group appears in same position you moved it to

## Debug Information

### **Console Logs Added**
- `onNodeDragStop`: Shows when group drag is detected
- `createGroupNodeFromInfo`: Shows position resolution
- Both logs should appear when dragging groups

### **Data Storage**
- **Group positions**: `scenario.groups.groupPositions = {tagName: {x, y}}`
- **Enabled states**: `scenario.groups.enabledTagGroups = [tagName1, tagName2]`

### **If Still Not Working**

1. **Check Console**: Look for the debug logs above
2. **Check Group ID**: Group nodes should have ID `group_${tagName}`
3. **Check Type**: Group nodes should have `data.config.type === "Group"`

## Expected Behavior

✅ **Group dragging**: Smooth, positions persist
✅ **Toggle states**: Survive page reloads
✅ **No snap-back**: Groups stay where you put them
✅ **Cross-session**: Everything persists in scenario data

Try the test and let me know if you still see the snap-back behavior!