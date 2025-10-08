"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tags,
  Filter,
  Group,
  Eye,
  EyeOff,
  FolderOpen,
  Folder,
  Plus,
  X,
  Edit3,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSimulationStore } from "@/stores/simulationStore";
import { type AnyNode } from "@/lib/simulation/types";

interface GroupManagementPanelProps {
  className?: string;
}

interface TagFilter {
  name: string;
  color: string;
  description?: string;
  nodeCount: number;
  isActive: boolean;
}

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange  
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
];

const GroupManagementPanel: React.FC<GroupManagementPanelProps> = ({ className }) => {
  const scenario = useSimulationStore(state => state.scenario);
  const loadScenario = useSimulationStore(state => state.loadScenario);
  const saveSnapshot = useSimulationStore(state => state.saveSnapshot);

  // Sync viewMode with scenario state
  const scenarioViewMode = scenario?.groups?.visualMode || "all";
  const [viewMode, setViewMode] = useState<"all" | "grouped" | "filtered">(scenarioViewMode);

  // Update viewMode when scenario changes
  React.useEffect(() => {
    if (scenario?.groups?.visualMode) {
      setViewMode(scenario.groups.visualMode);
    }
  }, [scenario?.groups?.visualMode]);

  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [isCreateTagDialogOpen, setIsCreateTagDialogOpen] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  
  // Group creation form
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(PRESET_COLORS[0]);
  
  // Tag creation form
  const [newTagName, setNewTagName] = useState("");
  const [newTagDescription, setNewTagDescription] = useState("");
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);

  // Compute available tags and their usage
  const availableTags = useMemo(() => {
    if (!scenario?.nodes) return [];
    
    // Get all tags from scenario groups config
    const configTags = scenario.groups?.tags || [];
    
    // Get all tags used in nodes
    const usedTags = new Set<string>();
    scenario.nodes.forEach(node => {
      if (node.tags) {
        node.tags.forEach(tag => usedTags.add(tag));
      }
    });
    
    // Combine configured tags with used tags
    const tagMap = new Map<string, TagFilter>();
    
    // Add configured tags
    configTags.forEach(tag => {
      const nodeCount = scenario.nodes.filter(node => 
        node.tags?.includes(tag.name)
      ).length;
      
      tagMap.set(tag.name, {
        name: tag.name,
        color: tag.color,
        description: tag.description,
        nodeCount,
        isActive: scenario.groups?.activeFilters?.includes(tag.name) || false,
      });
    });
    
    // Add used tags that aren't configured
    usedTags.forEach(tag => {
      if (!tagMap.has(tag)) {
        const nodeCount = scenario.nodes.filter(node => 
          node.tags?.includes(tag)
        ).length;
        
        tagMap.set(tag, {
          name: tag,
          color: PRESET_COLORS[Array.from(tagMap.keys()).length % PRESET_COLORS.length],
          nodeCount,
          isActive: scenario.groups?.activeFilters?.includes(tag) || false,
        });
      }
    });
    
    return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [scenario]);

  // Get existing groups
  const existingGroups = useMemo(() => {
    if (!scenario?.nodes) return [];
    return scenario.nodes.filter(node => node.type === "Group");
  }, [scenario?.nodes]);

  // Get nodes available for grouping (not already in groups)
  const availableNodes = useMemo(() => {
    if (!scenario?.nodes) return [];
    const groupedNodeIds = new Set<string>();
    
    // Collect all nodes that are already in groups
    scenario.nodes.forEach(node => {
      if (node.type === "Group") {
        node.containedNodes?.forEach(nodeId => groupedNodeIds.add(nodeId));
      }
    });
    
    // Return nodes not in any group
    return scenario.nodes.filter(node => 
      node.type !== "Group" && !groupedNodeIds.has(node.nodeId)
    );
  }, [scenario?.nodes]);

  const handleViewModeChange = (newMode: "all" | "grouped" | "filtered") => {
    if (!scenario) return;

    saveSnapshot(`Change view mode: ${newMode}`);

    if (newMode === "grouped") {
      // Convert tags to GroupNodes and persist them
      const { createAutomaticGroups, createGroupNodeFromInfo } = require("@/lib/utils/advancedGroupingUtils");

      const groups = createAutomaticGroups(scenario);
      const activeFilters = scenario.groups?.activeFilters || [];

      // Filter groups based on active filters
      const enabledGroups = activeFilters.length > 0
        ? groups.filter(group => activeFilters.includes(group.tagName))
        : groups;

      // Create GroupNodes
      const groupNodes = enabledGroups.map(group => createGroupNodeFromInfo(group, {}));

      // Remove old GroupNodes and add new ones
      const nodesWithoutGroups = scenario.nodes.filter(node => node.type !== "Group");

      const updatedScenario = {
        ...scenario,
        nodes: [...nodesWithoutGroups, ...groupNodes],
        groups: {
          ...scenario.groups,
          visualMode: "grouped" as const,
        },
      };

      loadScenario(updatedScenario);
      setViewMode("grouped");
    } else if (newMode === "all") {
      // Remove all GroupNodes when switching to "all" mode
      const nodesWithoutGroups = scenario.nodes.filter(node => node.type !== "Group");

      const updatedScenario = {
        ...scenario,
        nodes: nodesWithoutGroups,
        groups: {
          ...scenario.groups,
          visualMode: "all" as const,
        },
      };

      loadScenario(updatedScenario);
      setViewMode("all");
    } else {
      // "filtered" mode - keep scenario as is, just update mode
      const updatedScenario = {
        ...scenario,
        groups: {
          ...scenario.groups,
          visualMode: "filtered" as const,
        },
      };

      loadScenario(updatedScenario);
      setViewMode("filtered");
    }
  };

  const handleToggleTag = (tagName: string) => {
    if (!scenario) return;

    saveSnapshot(`Toggle tag filter: ${tagName}`);

    const activeFilters = scenario.groups?.activeFilters || [];
    const newActiveFilters = activeFilters.includes(tagName)
      ? activeFilters.filter(t => t !== tagName)
      : [...activeFilters, tagName];

    const updatedScenario = {
      ...scenario,
      groups: {
        ...scenario.groups,
        activeFilters: newActiveFilters,
      },
    };

    loadScenario(updatedScenario);

    // If in grouped mode and filters changed, regenerate groups
    if (viewMode === "grouped") {
      handleViewModeChange("grouped");
    }
  };

  const handleCreateGroup = () => {
    if (!scenario || !newGroupName.trim() || selectedNodes.length === 0) return;
    
    saveSnapshot(`Create group: ${newGroupName}`);
    
    // Generate unique group ID
    const groupId = `group_${Date.now()}`;
    
    // Create group node
    const groupNode = {
      nodeId: groupId,
      type: "Group" as const,
      displayName: newGroupName,
      position: { x: 0, y: 0 }, // Will be calculated based on contained nodes
      groupName: newGroupName,
      groupColor: newGroupColor,
      groupDescription: newGroupDescription || undefined,
      containedNodes: [...selectedNodes],
      isCollapsed: false,
    };
    
    // Calculate group position based on contained nodes
    const containedNodeConfigs = scenario.nodes.filter(node => 
      selectedNodes.includes(node.nodeId)
    );
    
    if (containedNodeConfigs.length > 0) {
      const avgX = containedNodeConfigs.reduce((sum, node) => 
        sum + (node.position?.x || 0), 0
      ) / containedNodeConfigs.length;
      const avgY = containedNodeConfigs.reduce((sum, node) => 
        sum + (node.position?.y || 0), 0
      ) / containedNodeConfigs.length;
      
      groupNode.position = { x: avgX - 100, y: avgY - 50 };
    }
    
    // Add group to nodes
    const updatedScenario = {
      ...scenario,
      nodes: [...scenario.nodes, groupNode],
    };
    
    loadScenario(updatedScenario);
    
    // Reset form
    setNewGroupName("");
    setNewGroupDescription("");
    setNewGroupColor(PRESET_COLORS[0]);
    setSelectedNodes([]);
    setIsCreateGroupDialogOpen(false);
  };

  const handleCreateTag = () => {
    if (!scenario || !newTagName.trim()) return;
    
    saveSnapshot(`Create tag: ${newTagName}`);
    
    const existingTags = scenario.groups?.tags || [];
    const newTag = {
      name: newTagName,
      color: newTagColor,
      description: newTagDescription || undefined,
    };
    
    const updatedScenario = {
      ...scenario,
      groups: {
        ...scenario.groups,
        tags: [...existingTags, newTag],
      },
    };
    
    loadScenario(updatedScenario);
    
    // Reset form
    setNewTagName("");
    setNewTagDescription("");
    setNewTagColor(PRESET_COLORS[0]);
    setIsCreateTagDialogOpen(false);
  };

  const handleToggleGroupCollapse = (groupId: string) => {
    if (!scenario) return;
    
    saveSnapshot(`Toggle group collapse: ${groupId}`);
    
    const updatedNodes = scenario.nodes.map(node => {
      if (node.nodeId === groupId && node.type === "Group") {
        return { ...node, isCollapsed: !node.isCollapsed };
      }
      return node;
    });
    
    const updatedScenario = { ...scenario, nodes: updatedNodes };
    loadScenario(updatedScenario);
  };

  // If no scenario is loaded, show a message
  if (!scenario) {
    return (
      <div className={cn("space-y-4 p-4", className)}>
        <div className="text-center text-gray-500">
          <Group className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm font-medium">No Template Loaded</p>
          <p className="text-xs">Load a template to manage groups and tags</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Group Management</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(viewMode === "all" ? "filtered" : "all")}
            className="h-7 px-2"
          >
            {viewMode === "all" ? <Eye className="h-3 w-3" /> : <Filter className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="flex items-center space-x-2">
        <Label className="text-xs">View:</Label>
        <Select value={viewMode} onValueChange={(value: "all" | "grouped" | "filtered") => handleViewModeChange(value)}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Nodes</SelectItem>
            <SelectItem value="grouped">Grouped View</SelectItem>
            <SelectItem value="filtered">Tag Filtered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tags Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Tags</Label>
          <Dialog open={isCreateTagDialogOpen} onOpenChange={setIsCreateTagDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <Plus className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Tag</DialogTitle>
                <DialogDescription>
                  Create a tag to categorize and filter nodes.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tag-name">Name</Label>
                  <Input
                    id="tag-name"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g., Data Processing"
                  />
                </div>
                <div>
                  <Label htmlFor="tag-description">Description (optional)</Label>
                  <Textarea
                    id="tag-description"
                    value={newTagDescription}
                    onChange={(e) => setNewTagDescription(e.target.value)}
                    placeholder="Brief description of this tag"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2 mt-2">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={cn(
                          "w-6 h-6 rounded border-2 transition-all",
                          newTagColor === color ? "border-gray-400" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateTagDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTag} disabled={!newTagName.trim()}>
                  Create Tag
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tag Filter List */}
        <ScrollArea className="h-32 border rounded-md p-2">
          {availableTags.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">
              No tags available. Create tags to categorize nodes.
            </div>
          ) : (
            <div className="space-y-1">
              {availableTags.map(tag => (
                <div key={tag.name} className="flex items-center justify-between p-1 hover:bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={tag.isActive}
                      onCheckedChange={() => handleToggleTag(tag.name)}
                    />
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-500">{tag.nodeCount}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <Separator />

      {/* Groups Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Groups</Label>
          <Dialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <Plus className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Node Group</DialogTitle>
                <DialogDescription>
                  Group selected nodes together for better organization.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="group-name">Group Name</Label>
                  <Input
                    id="group-name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Data Pipeline"
                  />
                </div>
                <div>
                  <Label htmlFor="group-description">Description (optional)</Label>
                  <Textarea
                    id="group-description"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Brief description of this group"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2 mt-2">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewGroupColor(color)}
                        className={cn(
                          "w-6 h-6 rounded border-2 transition-all",
                          newGroupColor === color ? "border-gray-400" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Select Nodes to Group</Label>
                  <ScrollArea className="h-32 border rounded-md p-2 mt-2">
                    {availableNodes.map(node => (
                      <div key={node.nodeId} className="flex items-center space-x-2 p-1">
                        <Checkbox
                          checked={selectedNodes.includes(node.nodeId)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedNodes([...selectedNodes, node.nodeId]);
                            } else {
                              setSelectedNodes(selectedNodes.filter(id => id !== node.nodeId));
                            }
                          }}
                        />
                        <span className="text-xs">{node.displayName}</span>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateGroupDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateGroup} 
                  disabled={!newGroupName.trim() || selectedNodes.length === 0}
                >
                  Create Group
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Existing Groups List */}
        <ScrollArea className="h-32 border rounded-md p-2">
          {existingGroups.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">
              No groups created. Group nodes together to manage complexity.
            </div>
          ) : (
            <div className="space-y-1">
              {existingGroups.map(group => (
                <div key={group.nodeId} className="flex items-center justify-between p-1 hover:bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleGroupCollapse(group.nodeId)}
                      className="p-0.5 hover:bg-gray-200 rounded"
                    >
                      {group.isCollapsed ? (
                        <Folder className="h-3 w-3" style={{ color: group.groupColor }} />
                      ) : (
                        <FolderOpen className="h-3 w-3" style={{ color: group.groupColor }} />
                      )}
                    </button>
                    <span className="text-xs font-medium">{group.groupName}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {group.containedNodes?.length || 0} nodes
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default GroupManagementPanel;