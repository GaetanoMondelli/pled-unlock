"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tags,
  Group,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSimulationStore } from "@/stores/simulationStore";

interface GroupManagementPanelSafeProps {
  className?: string;
}

const GroupManagementPanelSafe: React.FC<GroupManagementPanelSafeProps> = ({ className }) => {
  const scenario = useSimulationStore(state => state.scenario);
  const loadScenario = useSimulationStore(state => state.loadScenario);
  const saveSnapshot = useSimulationStore(state => state.saveSnapshot);
  
  const [newTagName, setNewTagName] = useState("");
  const [isCreateTagOpen, setIsCreateTagOpen] = useState(false);

  // Get available tags and their usage
  const availableTags = useMemo(() => {
    if (!scenario?.nodes) return [];
    
    const usedTags = new Set<string>();
    scenario.nodes.forEach(node => {
      if (node.tags) {
        node.tags.forEach(tag => usedTags.add(tag));
      }
    });
    
    return Array.from(usedTags).map(tag => ({
      name: tag,
      nodeCount: scenario.nodes.filter(node => node.tags?.includes(tag)).length,
    }));
  }, [scenario]);

  const handleCreateTag = () => {
    if (!scenario || !newTagName.trim()) return;
    
    saveSnapshot(`Create tag: ${newTagName}`);
    
    const existingTags = scenario.groups?.tags || [];
    const newTag = {
      name: newTagName,
      color: "#3b82f6",
      description: "Custom tag",
    };
    
    const updatedScenario = {
      ...scenario,
      groups: {
        ...scenario.groups,
        tags: [...existingTags, newTag],
      },
    };
    
    loadScenario(updatedScenario);
    setNewTagName("");
    setIsCreateTagOpen(false);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Group Management</h3>
        <Group className="h-4 w-4 text-gray-500" />
      </div>

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
              <div key={tag.name} className="flex items-center justify-between p-1 hover:bg-gray-50 rounded text-xs">
                <div className="flex items-center space-x-2">
                  <Tags className="h-3 w-3 text-blue-500" />
                  <span className="font-medium">{tag.name}</span>
                </div>
                <span className="text-gray-500">{tag.nodeCount} nodes</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Groups Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Groups</Label>
          <Button variant="ghost" size="sm" className="h-6 px-2" disabled>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <div className="border rounded-md p-2 min-h-20 bg-gray-50">
          <div className="text-xs text-gray-500 text-center py-4">
            Group creation coming soon...
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="text-xs text-gray-400 text-center pt-2 border-t">
        Grouping System Active • {scenario?.nodes?.length || 0} nodes total
      </div>
    </div>
  );
};

export default GroupManagementPanelSafe;