'use client';
import React from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';
import { Cpu } from 'lucide-react';
import type { RFNodeData, ProcessNode } from '@/lib/simulation/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const ProcessNodeDisplay: React.FC<NodeProps<RFNodeData>> = ({ data, selected }) => {
  const config = data.config as ProcessNode;
  const numInputs = config.inputNodeIds.length;
  const numOutputs = config.outputs.length;

  return (
    <Card className={cn(
      "w-60 shadow-lg transition-all duration-300", 
      selected && "ring-2 ring-primary", 
      data.isActive && "animate-pulse border-purple-400 shadow-purple-400/50 shadow-lg scale-105",
      data.error && "border-destructive shadow-destructive/50"
    )}>
      <CardHeader className={cn(
        "p-3 rounded-t-lg transition-colors duration-300",
        data.isActive ? "bg-purple-400/20" : "bg-accent/10"
      )}>
        <CardTitle className="text-sm font-semibold flex items-center">
          <Cpu className={cn(
            "h-4 w-4 mr-2 transition-colors duration-300",
            data.isActive ? "text-purple-500" : "text-accent"
          )} />
          {data.label}
          {data.isActive && (
            <div className="ml-auto w-2 h-2 bg-purple-500 rounded-full animate-ping" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 text-xs">
        <p>Type: {config.type}</p>
        <p>Inputs: {numInputs}</p>
        <p>Outputs: {numOutputs}</p>
        {config.outputs.map((out, i) => (
          <p key={i} className="truncate" title={out.formula}>Formula {i+1}: {out.formula}</p>
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