"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Tags,
  Group,
  Plus,
  Eye,
  FolderOpen,
  Users,
  ArrowRight,
  X,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSimulationStore } from "@/stores/simulationStore";
import { useToast } from "@/hooks/use-toast";
import {
  createAutomaticGroups,
  generateGroupedScenario,
  GroupInfo,
} from "@/lib/utils/advancedGroupingUtils";

interface ImprovedGroupManagementPanelProps {
  className?: string;
  onNavigateToGroup?: (groupTag: string, groupNodes: any[]) => void;
}

const ImprovedGroupManagementPanel: React.FC<ImprovedGroupManagementPanelProps> = ({
  className,
  onNavigateToGroup,
}) => {
  const scenario = useSimulationStore(state => state.scenario);
  const loadScenario = useSimulationStore(state => state.loadScenario);
  const saveSnapshot = useSimulationStore(state => state.saveSnapshot);

  const { toast } = useToast();
  const [newTagName, setNewTagName] = useState("");
  const [isCreateTagOpen, setIsCreateTagOpen] = useState(false);
  const [isGroupingEnabled, setIsGroupingEnabled] = useState(false);
  // Initialize enabled tag groups from scenario
  const [enabledTagGroups, setEnabledTagGroups] = useState<Set<string>>(() => {
    const savedEnabledTags = scenario?.groups?.enabledTagGroups || [];
    return new Set(savedEnabledTags);
  });

  // Get available tags and their usage
  const availableTags = useMemo(() => {
    if (!scenario) return [];

    const tagUsage = new Map<string, number>();

    // Count tags used on nodes
    if (scenario.nodes) {
      scenario.nodes.forEach(node => {
        if (node.tags) {
          node.tags.forEach(tag => {
            tagUsage.set(tag, (tagUsage.get(tag) || 0) + 1);
          });
        }
      });
    }

    // Add created tags from registry (even if not used yet)
    if (scenario.groups?.tags) {
      scenario.groups.tags.forEach(tag => {
        if (!tagUsage.has(tag.name)) {
          tagUsage.set(tag.name, 0);
        }
      });
    }

    return Array.from(tagUsage.entries()).map(([tag, count]) => ({
      name: tag,
      nodeCount: count,
    }));
  }, [scenario]);

  // Get automatic groups that would be created
  const potentialGroups = useMemo(() => {
    if (!scenario) return [];
    return createAutomaticGroups(scenario);
  }, [scenario]);

  // Sync enabled tags from scenario when it changes (but only if actually different)
  useEffect(() => {
    if (scenario?.groups?.enabledTagGroups) {
      const savedTags = new Set(scenario.groups.enabledTagGroups);
      const currentTags = Array.from(enabledTagGroups).sort().join(',');
      const savedTagsStr = Array.from(savedTags).sort().join(',');

      // Only update if different from current state
      if (currentTags !== savedTagsStr) {
        console.log("Restoring grouping state:", scenario.groups.enabledTagGroups);
        setEnabledTagGroups(savedTags);
        setIsGroupingEnabled(scenario.groups.enabledTagGroups.length > 0);
      }
    }
    // Don't reset to empty if no saved state - preserve user's current selection
  }, [scenario]);

  const handleCreateTag = () => {
    if (!scenario || !newTagName.trim()) return;

    saveSnapshot(`Create tag: ${newTagName}`);

    // Actually create and store the tag in the scenario
    const existingTags = scenario.groups?.tags || [];
    const newTag = {
      name: newTagName.trim(),
      color: "#3b82f6",
      description: "Custom tag",
    };

    // Check if tag already exists
    if (existingTags.some(tag => tag.name === newTag.name)) {
      toast({
        variant: "destructive",
        title: "Tag Exists",
        description: `Tag "${newTag.name}" already exists.`,
      });
      return;
    }

    const updatedScenario = {
      ...scenario,
      groups: {
        ...scenario.groups,
        tags: [...existingTags, newTag],
      },
    };

    loadScenario(updatedScenario);

    toast({
      title: "Tag Created",
      description: `Tag "${newTag.name}" has been created successfully.`,
    });

    setNewTagName("");
    setIsCreateTagOpen(false);
  };

  const handleToggleGrouping = (enabled: boolean) => {
    if (!scenario) return;

    if (enabled) {
      // Enable all tags with 2+ nodes for grouping
      const groupableTags = potentialGroups
        .filter(group => group.nodes.length >= 2)
        .map(group => group.tagName);
      setEnabledTagGroups(new Set(groupableTags));
    } else {
      // Disable all grouping
      setEnabledTagGroups(new Set());
    }

    // Update the visual mode based on enabled tags
    const updatedScenario = {
      ...scenario,
      groups: {
        ...scenario.groups,
        visualMode: enabled ? "grouped" as const : "all" as const,
        activeFilters: enabled ? Array.from(enabledTagGroups) : [],
      },
    };

    // This preserves all connections and original nodes
    loadScenario(updatedScenario);
    setIsGroupingEnabled(enabled);

    toast({
      title: enabled ? "Grouping Enabled" : "Grouping Disabled",
      description: enabled
        ? "Nodes with shared tags are now grouped visually"
        : "All nodes are now shown individually",
    });
  };

  const handleToggleTagGroup = (tagName: string, enabled: boolean) => {
    if (!scenario) {
      console.error("No scenario available!");
      return;
    }

    console.log("Toggle tag group:", tagName, "enabled:", enabled);

    const newEnabledTags = new Set(enabledTagGroups);
    if (enabled) {
      newEnabledTags.add(tagName);
    } else {
      newEnabledTags.delete(tagName);
    }
    setEnabledTagGroups(newEnabledTags);

    console.log("New enabled tags:", Array.from(newEnabledTags));

    // If enabling tags, generate grouped scenario with actual Group nodes
    let updatedScenario;
    if (newEnabledTags.size > 0) {
      // Create groups for enabled tags only
      const allGroups = createAutomaticGroups(scenario);
      const enabledGroups = allGroups.filter(g => newEnabledTags.has(g.tagName));

      // Get stored positions
      const storedGroupPositions = scenario.groups?.groupPositions || {};
      const { createGroupNodeFromInfo } = require("@/lib/utils/advancedGroupingUtils");
      const groupNodes = enabledGroups.map(g => createGroupNodeFromInfo(g, storedGroupPositions));

      // Remove grouped node IDs
      const groupedNodeIds = new Set<string>();
      enabledGroups.forEach(g => g.nodes.forEach(n => groupedNodeIds.add(n.nodeId)));

      // Create map of grouped nodeId -> group nodeId
      const nodeToGroupMap = new Map<string, string>();
      enabledGroups.forEach(g => {
        const groupId = `group_${g.tagName}`;
        g.nodes.forEach(n => nodeToGroupMap.set(n.nodeId, groupId));
      });

      // Keep ALL nodes as-is, including grouped ones - DON'T modify their connections
      // The visualization layer (GraphVisualization) will handle showing/hiding nodes
      const allNodes = scenario.nodes.filter(n => n.type !== "Group"); // Remove old group nodes only

      updatedScenario = {
        ...scenario,
        nodes: [...allNodes, ...groupNodes],
        groups: {
          ...scenario.groups,
          visualMode: "grouped" as const,
          activeFilters: Array.from(newEnabledTags),
          enabledTagGroups: Array.from(newEnabledTags),
        },
      };
    } else {
      // Remove all Group nodes - the original nodes are still there in the scenario
      // Just filter out Group type nodes
      updatedScenario = {
        ...scenario,
        nodes: scenario.nodes.filter(n => n.type !== "Group"),
        groups: {
          ...scenario.groups,
          visualMode: "all" as const,
          activeFilters: [],
          enabledTagGroups: [],
        },
      };
    }

    console.log("Loading updated scenario with visualMode:", updatedScenario.groups.visualMode);
    loadScenario(updatedScenario);

    // Update global grouping state
    setIsGroupingEnabled(newEnabledTags.size > 0);

    toast({
      title: enabled ? "Tag Grouped" : "Tag Ungrouped",
      description: `Tag "${tagName}" ${enabled ? 'enabled' : 'disabled'} for grouping`,
    });
  };

  const handleExploreGroup = (groupInfo: GroupInfo) => {
    if (onNavigateToGroup) {
      onNavigateToGroup(groupInfo.tagName, groupInfo.nodes);
    }
  };

  const handleDeleteTag = (tagName: string) => {
    if (!scenario) return;

    saveSnapshot(`Delete tag: ${tagName}`);

    // Remove tag from all nodes AND from registry
    const updatedNodes = scenario.nodes.map(node => {
      if (node.tags && node.tags.includes(tagName)) {
        return {
          ...node,
          tags: node.tags.filter(tag => tag !== tagName)
        };
      }
      return node;
    });

    // Remove tag from registry
    const updatedTags = (scenario.groups?.tags || []).filter(tag => tag.name !== tagName);

    const updatedScenario = {
      ...scenario,
      nodes: updatedNodes,
      groups: {
        ...scenario.groups,
        tags: updatedTags,
      },
    };

    loadScenario(updatedScenario);

    toast({
      title: "Tag Deleted",
      description: `Tag "${tagName}" has been removed from all nodes and deleted.`,
    });
  };

  const handleAssignSelectedToTag = (tagName: string) => {
    // This would require integration with node selection state
    // For now, just show the functionality
    console.log(`Assign selected nodes to tag: ${tagName}`);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Smart Grouping</h3>
        <Group className="h-4 w-4 text-gray-500" />
      </div>

      {/* Potential Groups Preview */}
      {potentialGroups.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">
              Detectable Groups ({potentialGroups.length})
            </Label>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
              {potentialGroups.reduce((sum, g) => sum + g.nodes.length, 0)} nodes
            </Badge>
          </div>

          <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
            {potentialGroups.map(groupInfo => (
              <div
                key={groupInfo.tagName}
                className="flex items-center justify-between p-2 hover:bg-white rounded text-xs border border-transparent hover:border-gray-200 transition-all"
              >
                <div className="flex items-center space-x-2 flex-1">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: groupInfo.tagName ? `#3b82f6` : '#gray' }}
                  />
                  <span className="font-medium truncate">{groupInfo.tagName}</span>
                  <Badge variant="outline" className="text-[9px] px-1">
                    {groupInfo.nodes.length} nodes
                  </Badge>
                </div>

                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-[9px] px-1">
                    {groupInfo.externalInputs.length}→{groupInfo.externalOutputs.length}
                  </Badge>

                  <Switch
                    checked={enabledTagGroups.has(groupInfo.tagName)}
                    onCheckedChange={(checked) => {
                      console.log("Switch toggled for:", groupInfo.tagName, "to:", checked);
                      handleToggleTagGroup(groupInfo.tagName, checked);
                    }}
                    className="scale-75"
                  />

                  {enabledTagGroups.has(groupInfo.tagName) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => handleExploreGroup(groupInfo)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Tags</Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => setIsCreateTagOpen(!isCreateTagOpen)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Create Tag Form */}
        {isCreateTagOpen && (
          <div className="space-y-2 p-3 border rounded-lg bg-gray-50">
            <Label htmlFor="tag-name" className="text-xs">Tag Name</Label>
            <Input
              id="tag-name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="e.g., Data Processing"
              className="h-7 text-xs"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
              >
                Create
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setIsCreateTagOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Tag List */}
        <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
          {availableTags.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">
              No tags available. Create tags to categorize nodes.
            </div>
          ) : (
            availableTags.map(tag => (
              <div key={tag.name} className="flex items-center justify-between p-1 hover:bg-gray-50 rounded text-xs group">
                <div className="flex items-center space-x-2 flex-1">
                  <Tags className="h-3 w-3 text-blue-500" />
                  <span className="font-medium">{tag.name}</span>
                  <Badge variant="outline" className="text-[9px] px-1">
                    {tag.nodeCount}
                  </Badge>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => handleAssignSelectedToTag(tag.name)}
                    title="Assign selected nodes to this tag"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>

                  {tag.nodeCount > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => {
                        const groupInfo = potentialGroups.find(g => g.tagName === tag.name);
                        if (groupInfo) handleExploreGroup(groupInfo);
                      }}
                      title="Explore this group"
                    >
                      <FolderOpen className="h-3 w-3" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-red-100 hover:text-red-600"
                    onClick={() => handleDeleteTag(tag.name)}
                    title="Delete this tag"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pt-2 border-t border-gray-200">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            disabled={!scenario?.nodes}
            onClick={() => handleToggleGrouping(!isGroupingEnabled)}
          >
            {isGroupingEnabled ? (
              <>
                <X className="h-3 w-3 mr-1" />
                Ungroup All
              </>
            ) : (
              <>
                <Users className="h-3 w-3 mr-1" />
                Auto Group
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status */}
      <div className="text-xs text-gray-400 text-center pt-2 border-t">
        {isGroupingEnabled ? (
          <>Grouping Active • {potentialGroups.length} groups • {scenario?.nodes?.length || 0} total</>
        ) : (
          <>Grouping Disabled • {scenario?.nodes?.length || 0} nodes shown</>
        )}
      </div>
    </div>
  );
};

export default ImprovedGroupManagementPanel;