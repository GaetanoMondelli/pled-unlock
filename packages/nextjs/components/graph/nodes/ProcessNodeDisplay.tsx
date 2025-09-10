"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProcessNode, RFNodeData } from "@/lib/simulation/types";
import { cn } from "@/lib/utils";
import { Cpu } from "lucide-react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";

const ProcessNodeDisplay: React.FC<NodeProps<RFNodeData>> = ({ data, selected }) => {
  const config = data.config as ProcessNode;
  const numInputs = config.inputNodeIds.length;
  const numOutputs = config.outputs.length;

  return (
    <Card
      className={cn(
        "w-36 shadow-md transition-all duration-300",
        selected && "ring-2 ring-primary",
        data.isActive && "animate-pulse border-purple-400 shadow-purple-400/50 shadow-lg scale-105",
        data.error && "border-destructive shadow-destructive/50",
      )}
    >
      <CardHeader
        className={cn(
          "p-2 rounded-t-lg transition-colors duration-300",
          data.isActive ? "bg-purple-400/20" : "bg-accent/10",
        )}
      >
        <CardTitle className="text-xs font-semibold flex items-center">
          <Cpu
            className={cn(
              "h-3 w-3 mr-1 transition-colors duration-300",
              data.isActive ? "text-purple-500" : "text-accent",
            )}
          />
          {data.label}
          {data.isActive && <div className="ml-auto w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 text-[10px]">
        <p>Type: {config.type}</p>
        <p>Inputs: {numInputs}</p>
        <p>Outputs: {numOutputs}</p>
        {config.outputs.map((out, i) => (
          <p key={i} className="truncate" title={out.formula}>
            Formula {i + 1}: {out.formula}
          </p>
        ))}
        {data.details && <p className="mt-1 text-muted-foreground">{data.details}</p>}
        {data.error && <p className="mt-1 text-destructive">{data.error}</p>}
      </CardContent>
      {/* Input Handles */}
      {config.inputNodeIds.map((inputId, index) => (
        <Handle
          key={`input-${inputId}-${index}`}
          type="target"
          position={Position.Left}
          id={`input-${inputId}`}
          style={{ top: `${(index + 1) * (100 / (numInputs + 1))}%` }}
          className="w-3 h-3 !bg-secondary"
        />
      ))}
      {/* Output Handles */}
      {config.outputs.map((output, index) => (
        <Handle
          key={`output-${index}`}
          type="source"
          position={Position.Right}
          id={`output-${index}`}
          style={{ top: `${(index + 1) * (100 / (numOutputs + 1))}%` }}
          className="w-3 h-3 !bg-primary"
        />
      ))}
    </Card>
  );
};

export default React.memo(ProcessNodeDisplay);
