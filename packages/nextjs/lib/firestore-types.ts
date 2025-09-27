import type { Scenario } from '@/lib/simulation/types';

// Separated types to avoid importing Firebase Admin in client code
export interface TemplateDocument {
  id: string;
  name: string;
  description?: string;
  scenario: Scenario;
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  version: string;
  // Optional execution state for templates with saved simulation progress
  executionState?: {
    scenario: Scenario;
    nodeStates: Record<string, any>;
    currentTime: number;
    eventCounter: number;
    nodeActivityLogs: Record<string, any[]>;
    globalActivityLog: any[];
    simulationSpeed: number;
    lastSavedAt: number;
  };
}

export interface ExecutionDocument {
  id: string;
  templateId: string;
  name: string;
  description?: string;
  // Complete simulation state for reconstruction
  scenario: Scenario;
  nodeStates: Record<string, any>;
  currentTime: number;
  eventCounter: number;
  globalActivityLog: any[];
  nodeActivityLogs: Record<string, any[]>;
  // Execution metadata
  startedAt: number;
  lastSavedAt: number;
  isCompleted: boolean;
  createdBy?: string;
}