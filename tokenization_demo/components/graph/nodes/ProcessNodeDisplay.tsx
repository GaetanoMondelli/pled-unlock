'use client';
import React from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';
import { Cpu } from 'lucide-react'; // Using Cpu as Workflow is similar to GitFork/GitMerge
import type { RFNodeData, ProcessNode } from '@/lib/simulation/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const ProcessNodeDisplay: React.FC<NodeProps<RFNodeData>> = ({ data, selected }) => {
  const config = data.config as ProcessNode;
  const numInputs = config.inputNodeIds.length;
  const numOutputs = config.outputs.length;

  return (
    <Card className={cn("w-60 shadow-lg", selected && "ring-2 ring-primary", data.isActive && "animate-pulse border-accent")}>
      <CardHeader className="p-3 bg-accent/10 rounded-t-lg">
        <CardTitle className="text-sm font-semibold flex items-center">
          <Cpu className="h-4 w-4 mr-2 text-accent" />
          {data.label}
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
      {/* Input Handles - spaced based on number of inputs */}
      {config.inputNodeIds.map((inputId, index) => (
        <Handle
          key={`input-${inputId}-${index}`}
          type="target"
          position={Position.Left}
          id={`input-${inputId}`} // More specific ID tied to expected source
          style={{ top: `${(index + 1) * (100 / (numInputs + 1))}%` }}
          className="w-3 h-3 !bg-secondary"
        />
      ))}
      {/* Output Handles - spaced based on number of outputs */}
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
