"use client";

import React, { useMemo } from "react";
import { Handle, Position } from "reactflow";
import { Minimize2, Maximize2, Folder, FolderOpen, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { type RFNodeData } from "@/lib/simulation/types";

interface GroupNodeDisplayProps {
  data: RFNodeData & {
    config: {
      type: "Group";
      groupName: string;
      groupColor: string;
      groupDescription?: string;
      containedNodes: string[];
      isCollapsed: boolean;
      inputs?: Array<{ name: string }>;
      outputs?: Array<{ name: string }>;
    };
    nodeCount?: number;
  };
  selected?: boolean;
}

const GroupNodeDisplay: React.FC<GroupNodeDisplayProps> = ({ data, selected = false }) => {
  const { config, nodeCount = 0 } = data;
  const { groupName, groupColor, groupDescription, containedNodes, isCollapsed, inputs = [], outputs = [] } = config;

  // Calculate dynamic width based on content
  const baseWidth = 200;
  const nameWidth = groupName.length * 8;
  const minWidth = Math.max(baseWidth, nameWidth + 60);

  // Dynamic height based on collapse state
  const collapsedHeight = 80;
  const expandedHeight = Math.max(120, 60 + containedNodes.length * 8);
  const height = isCollapsed ? collapsedHeight : expandedHeight;

  const inputCount = inputs.length;
  const outputCount = outputs.length;

  return (
    <div
      className={cn(
        "group/groupnode relative rounded-lg shadow-lg transition-all duration-200",
        selected ? "ring-2 ring-blue-400 ring-offset-2" : "",
      )}
      style={{
        width: minWidth,
        height,
        backgroundColor: `${groupColor}10`, // Very light tint
        borderLeft: `4px solid ${groupColor}`,
      }}
    >
      {/* Navigate Into Group Button - appears on hover */}
      <button
        className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full opacity-0 group-hover/groupnode:opacity-100 transition-opacity flex items-center justify-center shadow-lg z-10"
        onClick={(e) => {
          e.stopPropagation();
          // Trigger double-click behavior to navigate into group
          const event = new MouseEvent('dblclick', { bubbles: true });
          e.currentTarget.parentElement?.dispatchEvent(event);
        }}
        title="Explore group contents"
      >
        <Maximize2 className="h-3 w-3" />
      </button>

      {/* Header */}
      <div
        className="flex items-center justify-between p-3 rounded-t-lg"
        style={{
          backgroundColor: `${groupColor}20`,
          borderBottom: `1px solid ${groupColor}30`,
        }}
      >
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <Folder className="h-4 w-4" style={{ color: groupColor }} />
          ) : (
            <FolderOpen className="h-4 w-4" style={{ color: groupColor }} />
          )}
          <span className="font-semibold text-sm text-gray-800">{groupName}</span>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Node count badge */}
          <span
            className="text-xs px-2 py-1 rounded-full font-medium"
            style={{
              backgroundColor: `${groupColor}30`,
              color: groupColor,
            }}
          >
            {containedNodes.length} nodes
          </span>

          {/* Collapse/Expand button */}
          <button
            className="p-1 hover:bg-white/50 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
            }}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3 text-gray-600" />
            ) : (
              <ChevronDown className="h-3 w-3 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3">
        {isCollapsed ? (
          // Collapsed view - show summary
          <div className="space-y-1">
            {groupDescription && (
              <p className="text-xs text-gray-600 truncate">{groupDescription}</p>
            )}
            <div className="flex justify-between text-xs text-gray-500">
              <span>{inputCount} inputs</span>
              <span>{outputCount} outputs</span>
            </div>
          </div>
        ) : (
          // Expanded view - show more details
          <div className="space-y-2">
            {groupDescription && (
              <p className="text-xs text-gray-600">{groupDescription}</p>
            )}
            
            {containedNodes.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-700 mb-1">Contains {containedNodes.length} nodes:</div>
                <div className="text-xs text-gray-600 space-y-0.5 max-h-24 overflow-y-auto bg-gray-50 rounded p-2">
                  {containedNodes.slice(0, 6).map((nodeId, index) => (
                    <div key={nodeId} className="truncate flex items-center justify-between">
                      <span>• {nodeId.split('_')[0]}</span>
                      <span className="text-gray-400 text-[10px]">{nodeId.split('_')[1] || ''}</span>
                    </div>
                  ))}
                  {containedNodes.length > 6 && (
                    <div className="text-gray-400 text-center italic">
                      +{containedNodes.length - 6} more nodes
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {(inputCount > 0 || outputCount > 0) && (
              <div className="space-y-1 border-t pt-2">
                {inputCount > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-700">Inputs ({inputCount}):</span>
                    <div className="text-[10px] text-gray-500 ml-2">
                      {inputs.slice(0, 3).map(input => input.name.split('.')[1] || input.name).join(', ')}
                      {inputCount > 3 && ` +${inputCount - 3} more`}
                    </div>
                  </div>
                )}
                {outputCount > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-700">Outputs ({outputCount}):</span>
                    <div className="text-[10px] text-gray-500 ml-2">
                      {outputs.slice(0, 3).map(output => output.name.split('.')[1] || output.name).join(', ')}
                      {outputCount > 3 && ` +${outputCount - 3} more`}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Handles */}
      {inputs.map((input, index) => (
        <Handle
          key={`input-${input.name}`}
          type="target"
          position={Position.Left}
          id={`input-${input.name}`}
          style={{
            top: `${20 + (index * (height - 40)) / Math.max(1, inputCount - 1)}%`,
            backgroundColor: groupColor,
            border: `2px solid white`,
            width: 10,
            height: 10,
          }}
          className="transition-all duration-200 hover:scale-125"
        />
      ))}

      {/* Output Handles */}
      {outputs.map((output, index) => (
        <Handle
          key={`output-${output.name}`}
          type="source"
          position={Position.Right}
          id={`output-${output.name}`}
          style={{
            top: `${20 + (index * (height - 40)) / Math.max(1, outputCount - 1)}%`,
            backgroundColor: groupColor,
            border: `2px solid white`,
            width: 10,
            height: 10,
          }}
          className="transition-all duration-200 hover:scale-125"
        />
      ))}

      {/* Activity Indicator */}
      {data.isActive && (
        <div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
          style={{ backgroundColor: groupColor }}
        />
      )}
    </div>
  );
};

export default GroupNodeDisplay;