"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QueueNode, RFNodeData } from "@/lib/simulation/types";
import { cn } from "@/lib/utils";
import { Archive } from "lucide-react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";

const QueueNodeDisplay: React.FC<NodeProps<RFNodeData>> = ({ data, selected }) => {
  const config = data.config as QueueNode;
  return (
    <Card
      className={cn(
        "w-36 shadow-md transition-all duration-300",
        selected && "ring-2 ring-primary",
        data.isActive && "animate-pulse border-blue-400 shadow-blue-400/50 shadow-lg scale-105",
        data.error && "border-destructive shadow-destructive/50",
      )}
    >
      <CardHeader
        className={cn(
          "p-2 rounded-t-lg transition-colors duration-300",
          data.isActive ? "bg-blue-400/20" : "bg-green-600/10",
        )}
      >
        <CardTitle className="text-xs font-semibold flex items-center">
          <Archive
            className={cn(
              "h-3 w-3 mr-1 transition-colors duration-300",
              data.isActive ? "text-blue-500" : "text-green-700",
            )}
          />
          {data.label}
          {data.isActive && <div className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 text-[10px]">
        <p>{config.type}</p>
        <p>Win: {config.timeWindow}s</p>
        <p>{config.aggregationMethod}</p>
        {config.capacity && <p>Cap: {config.capacity}</p>}
        {data.details && <p className="mt-1 text-muted-foreground">{data.details}</p>}
        {data.error && <p className="mt-1 text-destructive">{data.error}</p>}
      </CardContent>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-secondary" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-primary" />
    </Card>
  );
};

export default React.memo(QueueNodeDisplay);
