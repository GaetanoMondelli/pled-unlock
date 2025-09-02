// Shared types for lineage components
import type { TokenLineage as ImportedTokenLineage } from "@/lib/simulation/tokenGenealogyEngine";

// Re-export TokenLineage 
export type TokenLineage = ImportedTokenLineage;

export interface TreeNodeData {
  id: string;
  tokenId: string;
  value: number;
  nodeId: string;
  nodeName: string;
  operation?: {
    type: string;
    method?: string;
    formula?: string;
    calculation?: string;
  };
  isRoot: boolean;
  isTarget: boolean;
  timestamp?: number;
  children?: TreeNodeData[];
}

export interface TokenLineageNode {
  id: string;
  tokenId: string;
  value: any;
  nodeId: string;
  nodeName: string;
  operation?: {
    type: string;
    method?: string;
    formula?: string;
    calculation?: string;
  };
  isRoot: boolean;
  isTarget: boolean;
  timestamp?: number;
  children: TokenLineageNode[];
}

export interface LineageTableProps {
  lineage: TokenLineage;
  onTokenClick: (tokenId: string) => void;
  nodesConfig?: Record<string, { displayName: string }>;
}

export interface ExpandableTokenTreeProps {
  lineage: TokenLineage;
  onTokenClick: (tokenId: string) => void;
  nodesConfig?: Record<string, { displayName: string }>;
  showCompleteHistory?: boolean;
}