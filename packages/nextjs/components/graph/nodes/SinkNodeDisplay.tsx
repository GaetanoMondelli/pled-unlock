'use client';
import React from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';
import { Trash2 } from 'lucide-react';
import type { RFNodeData, SinkNode } from '@/lib/simulation/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const SinkNodeDisplay: React.FC<NodeProps<RFNodeData>> = ({ data, selected }) => {
  const config = data.config as SinkNode;
  return (
    <Card className={cn(
      "w-52 shadow-lg transition-all duration-300", 
      selected && "ring-2 ring-primary", 
      data.isActive && "animate-pulse border-orange-400 shadow-orange-400/50 shadow-lg scale-105",
      data.error && "border-destructive shadow-destructive/50"
    )}>
      <CardHeader className={cn(
        "p-3 rounded-t-lg transition-colors duration-300",
        data.isActive ? "bg-orange-400/20" : "bg-muted/50"
      )}>
        <CardTitle className="text-sm font-semibold flex items-center">
          <Trash2 className={cn(
            "h-4 w-4 mr-2 transition-colors duration-300",
            data.isActive ? "text-orange-500" : "text-muted-foreground"
          )} />
          {data.label}
          {data.isActive && (
            <div className="ml-auto w-2 h-2 bg-orange-500 rounded-full animate-ping" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 text-xs">
        <p>Type: {config.type}</p>
        {data.details && <p className="mt-1 text-muted-foreground">{data.details}</p>}
        {data.error && <p className="mt-1 text-destructive">{data.error}</p>}
      </CardContent>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-secondary" />
    </Card>
  );
};

export default React.memo(SinkNodeDisplay);