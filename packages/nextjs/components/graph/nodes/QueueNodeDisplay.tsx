'use client';
import React from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';
import { Archive } from 'lucide-react';
import type { RFNodeData, QueueNode } from '@/lib/simulation/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const QueueNodeDisplay: React.FC<NodeProps<RFNodeData>> = ({ data, selected }) => {
  const config = data.config as QueueNode;
  return (
    <Card className={cn("w-52 shadow-lg", selected && "ring-2 ring-primary", data.isActive && "animate-pulse border-accent")}>
      <CardHeader className="p-3 bg-green-600/10 rounded-t-lg">
        <CardTitle className="text-sm font-semibold flex items-center">
          <Archive className="h-4 w-4 mr-2 text-green-700" />
          {data.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 text-xs">
        <p>Type: {config.type}</p>
        <p>Window: {config.timeWindow}s</p>
        <p>Method: {config.aggregationMethod}</p>
        {config.capacity && <p>Capacity: {config.capacity}</p>}
        {data.details && <p className="mt-1 text-muted-foreground">{data.details}</p>}
        {data.error && <p className="mt-1 text-destructive">{data.error}</p>}
      </CardContent>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-secondary" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-primary" />
    </Card>
  );
};

export default React.memo(QueueNodeDisplay);
