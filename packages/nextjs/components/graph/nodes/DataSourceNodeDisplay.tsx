'use client';
import React from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';
import { DatabaseZap } from 'lucide-react';
import type { RFNodeData, DataSourceNode } from '@/lib/simulation/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const DataSourceNodeDisplay: React.FC<NodeProps<RFNodeData>> = ({ data, selected }) => {
  const config = data.config as DataSourceNode;
  return (
    <Card className={cn(
      "w-52 shadow-lg transition-all duration-300", 
      selected && "ring-2 ring-primary", 
      data.isActive && "animate-pulse border-green-400 shadow-green-400/50 shadow-lg scale-105",
      data.error && "border-destructive shadow-destructive/50"
    )}>
      <CardHeader className={cn(
        "p-3 rounded-t-lg transition-colors duration-300",
        data.isActive ? "bg-green-400/20" : "bg-primary/10"
      )}>
        <CardTitle className="text-sm font-semibold flex items-center">
          <DatabaseZap className={cn(
            "h-4 w-4 mr-2 transition-colors duration-300",
            data.isActive ? "text-green-500" : "text-primary"
          )} />
          {data.label}
          {data.isActive && (
            <div className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-ping" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 text-xs">
        <p>Type: {config.type}</p>
        <p>Interval: {config.interval}s</p>
        <p>Value: [{config.valueMin}-{config.valueMax}]</p>
        {data.details && <p className="mt-1 text-muted-foreground">{data.details}</p>}
        {data.error && <p className="mt-1 text-destructive">{data.error}</p>}
      </CardContent>
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-primary" />
    </Card>
  );
};

export default React.memo(DataSourceNodeDisplay);