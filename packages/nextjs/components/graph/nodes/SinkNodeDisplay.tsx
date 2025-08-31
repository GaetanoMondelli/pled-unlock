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
    <Card className={cn("w-52 shadow-lg", selected && "ring-2 ring-primary", data.isActive && "animate-pulse border-accent")}>
      <CardHeader className="p-3 bg-muted/50 rounded-t-lg">
        <CardTitle className="text-sm font-semibold flex items-center">
          <Trash2 className="h-4 w-4 mr-2 text-muted-foreground" />
          {data.label}
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
