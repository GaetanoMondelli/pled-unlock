"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RFNodeData, SinkNode } from "@/lib/simulation/types";
import { cn } from "@/lib/utils";
import { Trash2, Circle } from "lucide-react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";

// Helper function to get state machine display info
const getStateMachineDisplay = (currentState?: string) => {
  if (!currentState) return null;
  
  const stateInfo: Record<string, { color: string; displayName: string }> = {
    sink_idle: { color: "text-gray-500", displayName: "idle" },
    sink_processing: { color: "text-orange-500", displayName: "processing" },
  };
  
  return stateInfo[currentState] || { color: "text-gray-400", displayName: "unknown" };
};

const SinkNodeDisplay: React.FC<NodeProps<RFNodeData>> = ({ data, selected }) => {
  const config = data.config as SinkNode;
  const stateMachineInfo = getStateMachineDisplay(data.stateMachine?.currentState);
  return (
    <Card
      className={cn(
        "w-36 shadow-md transition-all duration-300",
        selected && "ring-2 ring-primary",
        data.isActive && "animate-pulse border-orange-400 shadow-orange-400/50 shadow-lg scale-105",
        data.error && "border-destructive shadow-destructive/50",
      )}
    >
      <CardHeader
        className={cn(
          "p-2 rounded-t-lg transition-colors duration-300 bg-amber-600 text-white",
        )}
      >
        <CardTitle className="text-xs font-semibold flex items-center text-white">
          <Trash2 className="h-3 w-3 mr-1" />
          {data.label}
          {/* State Machine Indicator */}
          {stateMachineInfo && (
            <div 
              className="ml-1" 
              title={`State: ${stateMachineInfo.displayName}`}
            >
              <Circle className="h-2 w-2 fill-current text-white/80" />
            </div>
          )}
          {data.isActive && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-ping" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 text-[10px] space-y-0.5">
        {/* Config Section */}
        <div className="space-y-0.5">
          <p className="font-medium text-muted-foreground">CONFIG:</p>
          <p>Type: Terminal</p>
        </div>
        
        {/* Separator */}
        <div className="border-t border-muted-foreground/20 my-1"></div>
        
        {/* Runtime Section */}
        <div className="space-y-0.5">
          <p className="font-medium text-muted-foreground">RUNTIME:</p>
          {stateMachineInfo && (
            <p className="font-mono" style={{ color: stateMachineInfo.color.replace('text-', '') }}>
              {stateMachineInfo.displayName}
            </p>
          )}
          {data.details && <p className="text-muted-foreground leading-tight">{data.details}</p>}
        </div>
        
        {data.error && <p className="mt-1 text-destructive text-xs">{data.error}</p>}
      </CardContent>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-secondary" />
    </Card>
  );
};

export default React.memo(SinkNodeDisplay);
