import { nanoid } from "@/lib/nanoid";
import { evaluateFormula } from "@/lib/simulation/formulaEngine";
import {
  calculateGenerationLevel,
  createAggregationDetails,
  createEnhancedSourceTokenSummaries,
  createLineageMetadata,
  createTransformationDetails,
  determineOperationType,
  extractUltimateSources,
} from "@/lib/simulation/lineageHelpers";
import {
  type AggregationDetails,
  type AnyNode,
  type AnyNodeState,
  DataSourceNodeSchema,
  type DataSourceState,
  type HistoryEntry,
  type LineageMetadata,
  ProcessNodeSchema,
  type ProcessNodeState,
  QueueNodeSchema,
  type QueueState,
  type Scenario,
  SinkNodeSchema,
  type SinkState,
  type SourceTokenSummary,
  type Token,
  type TransformationDetails,
} from "@/lib/simulation/types";
import { validateScenario } from "@/lib/simulation/validation";
import { z } from "zod";
import { create } from "zustand";

const MAX_SINK_TOKENS_STORED = 50;
const MAX_NODE_ACTIVITY_LOGS = 500;
const MAX_GLOBAL_ACTIVITY_LOGS = 1000;

interface SimulationState {
  scenario: Scenario | null;
  nodesConfig: Record<string, AnyNode>;
  nodeStates: Record<string, AnyNodeState>;
  currentTime: number;
  isRunning: boolean;
  simulationSpeed: number;
  eventCounter: number;
  nodeActivityLogs: Record<string, HistoryEntry[]>;
  globalActivityLog: HistoryEntry[];
  selectedNodeId: string | null;
  selectedToken: Token | null;
  isGlobalLedgerOpen: boolean;
  errorMessages: string[];

  // Actions
  loadScenario: (scenarioData: any) => Promise<void>;
  play: () => void;
  pause: () => void;
  stepForward: (timeIncrement?: number) => void;
  tick: () => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setSelectedToken: (token: Token | null) => void;
  clearErrors: () => void;
  updateNodeConfigInStore: (nodeId: string, newConfigData: any) => boolean;
  toggleGlobalLedger: () => void;

  // Helper functions
  _updateNodeState: (nodeId: string, partialState: Partial<AnyNodeState>) => void;
  _logNodeActivity: (
    nodeIdForLog: string,
    logCoreDetails: Omit<HistoryEntry, "timestamp" | "nodeId" | "epochTimestamp" | "sequence">,
    timestamp: number,
  ) => HistoryEntry;
  _createToken: (originNodeId: string, value: any, timestamp: number, sourceTokens?: Token[]) => Token;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  // Initial state
  scenario: null,
  nodesConfig: {},
  nodeStates: {},
  currentTime: 0,
  isRunning: false,
  simulationSpeed: 1,
  eventCounter: 0,
  nodeActivityLogs: {},
  globalActivityLog: [],
  selectedNodeId: null,
  selectedToken: null,
  isGlobalLedgerOpen: false,
  errorMessages: [],

  // Actions
  loadScenario: async (scenarioData: any) => {
    const { scenario: parsedScenario, errors } = validateScenario(scenarioData);
    if (errors.length > 0) {
      set({
        errorMessages: errors,
        scenario: null,
        nodesConfig: {},
        nodeStates: {},
        globalActivityLog: [],
        nodeActivityLogs: {},
        eventCounter: 0,
      });
      return;
    }
    if (!parsedScenario) {
      set({
        errorMessages: ["Failed to parse scenario."],
        scenario: null,
        nodesConfig: {},
        nodeStates: {},
        globalActivityLog: [],
        nodeActivityLogs: {},
        eventCounter: 0,
      });
      return;
    }

    const nodesConfig: Record<string, AnyNode> = {};
    const initialNodeStates: Record<string, AnyNodeState> = {};
    const initialLogs: Record<string, HistoryEntry[]> = {};

    parsedScenario.nodes.forEach(node => {
      nodesConfig[node.nodeId] = node;
      initialLogs[node.nodeId] = [];
      switch (node.type) {
        case "DataSource":
          initialNodeStates[node.nodeId] = { 
            lastEmissionTime: -1,
            stateMachine: {
              currentState: "source_idle",
              transitionHistory: []
            }
          } as DataSourceState;
          break;
        case "Queue":
          initialNodeStates[node.nodeId] = { 
            inputBuffer: [], 
            outputBuffer: [], 
            lastAggregationTime: -1,
            stateMachine: {
              currentState: "queue_idle",
              transitionHistory: []
            }
          } as QueueState;
          break;
        case "ProcessNode":
          const inputBuffers: Record<string, Token[]> = {};
          initialNodeStates[node.nodeId] = { 
            inputBuffers, 
            lastFiredTime: -1,
            stateMachine: {
              currentState: "process_idle",
              transitionHistory: []
            }
          } as ProcessNodeState;
          break;
        case "Sink":
          initialNodeStates[node.nodeId] = {
            consumedTokenCount: 0,
            lastConsumedTime: -1,
            consumedTokens: [],
            stateMachine: {
              currentState: "sink_idle",
              transitionHistory: []
            }
          } as SinkState;
          break;
      }
    });

    set({
      scenario: parsedScenario,
      nodesConfig,
      nodeStates: initialNodeStates,
      currentTime: 0,
      isRunning: false,
      nodeActivityLogs: initialLogs,
      globalActivityLog: [],
      errorMessages: [],
      selectedNodeId: null,
      selectedToken: null,
      isGlobalLedgerOpen: false,
      eventCounter: 0,
    });
  },

  play: () => {
    set({ isRunning: true });
    const runSimulation = () => {
      const state = get();
      if (state.isRunning) {
        state.tick();
        setTimeout(runSimulation, 1000 / state.simulationSpeed);
      }
    };
    setTimeout(runSimulation, 1000 / get().simulationSpeed);
  },

  pause: () => set({ isRunning: false }),

  stepForward: (timeIncrement = 1) => {
    const { tick, isRunning } = get();
    if (isRunning) {
      console.warn("Cannot step forward while simulation is running. Pause first.");
      return;
    }
    for (let i = 0; i < timeIncrement; i++) {
      tick();
    }
  },

  tick: () => {
    const { nodesConfig, _logNodeActivity, _createToken, _updateNodeState } = get();
    const newTime = get().currentTime + 1;
    set({ currentTime: newTime });

    // Process DataSource nodes
    Object.values(nodesConfig).forEach(nodeConfig => {
      const currentNodeState = get().nodeStates[nodeConfig.nodeId];

      if (nodeConfig.type === "DataSource") {
        const dsState = currentNodeState as DataSourceState;
        if (newTime >= (dsState.lastEmissionTime < 0 ? 0 : dsState.lastEmissionTime) + nodeConfig.interval) {
          const value =
            Math.floor(Math.random() * (nodeConfig.valueMax - nodeConfig.valueMin + 1)) + nodeConfig.valueMin;
          const token = _createToken(nodeConfig.nodeId, value, newTime);
          const emissionLog = _logNodeActivity(
            nodeConfig.nodeId,
            { action: "EMITTED", value: token.value, details: `Token ${token.id} to ${nodeConfig.destinationNodeId}` },
            newTime,
          );

          const destNodeConfig = nodesConfig[nodeConfig.destinationNodeId];
          if (destNodeConfig) {
            const destNodeState = get().nodeStates[destNodeConfig.nodeId];
            const arrivalLogDetails = `Token ${token.id} from ${nodeConfig.displayName}`;
            const arrivalLog = _logNodeActivity(
              destNodeConfig.nodeId,
              { action: "TOKEN_ARRIVED_AT_NODE", value: token.value, details: arrivalLogDetails },
              newTime,
            );
            token.history.push(arrivalLog);

            if (destNodeConfig.type === "Queue") {
              const qState = destNodeState as QueueState;
              if (destNodeConfig.capacity && qState.inputBuffer.length >= destNodeConfig.capacity) {
                const dropLog = _logNodeActivity(
                  destNodeConfig.nodeId,
                  {
                    action: "DROPPED_AT_QUEUE_INPUT_FULL",
                    value: token.value,
                    details: `From ${nodeConfig.displayName}, Token ${token.id}`,
                  },
                  newTime,
                );
                token.history.push(dropLog);
              } else {
                _updateNodeState(destNodeConfig.nodeId, { inputBuffer: [...qState.inputBuffer, token] });
                _logNodeActivity(
                  destNodeConfig.nodeId,
                  {
                    action: "TOKEN_ADDED_TO_INPUT_BUFFER",
                    value: token.value,
                    details: `From ${nodeConfig.displayName}. New size: ${qState.inputBuffer.length + 1}`,
                  },
                  newTime,
                );
              }
            } else if (destNodeConfig.type === "ProcessNode") {
              const pnState = destNodeState as ProcessNodeState;
              const bufferForInput = pnState.inputBuffers[nodeConfig.nodeId] || [];
              _updateNodeState(destNodeConfig.nodeId, {
                inputBuffers: { ...pnState.inputBuffers, [nodeConfig.nodeId]: [...bufferForInput, token] },
              });
              _logNodeActivity(
                destNodeConfig.nodeId,
                {
                  action: "TOKEN_ADDED_TO_INPUT_BUFFER",
                  value: token.value,
                  details: `From ${nodeConfig.displayName} into buffer for ${nodeConfig.nodeId}. New size: ${bufferForInput.length + 1}`,
                },
                newTime,
              );
            } else if (destNodeConfig.type === "Sink") {
              const sinkState = destNodeState as SinkState;
              const updatedConsumedTokens = [...(sinkState.consumedTokens || []), token].slice(-MAX_SINK_TOKENS_STORED);
              _updateNodeState(destNodeConfig.nodeId, {
                consumedTokenCount: (sinkState.consumedTokenCount || 0) + 1,
                lastConsumedTime: newTime,
                consumedTokens: updatedConsumedTokens,
              });
              const sinkConsumptionLog = _logNodeActivity(
                destNodeConfig.nodeId,
                { action: "CONSUMED_BY_SINK_NODE", value: token.value, details: arrivalLogDetails },
                newTime,
              );
              token.history.push(sinkConsumptionLog);
            }
          }
          _updateNodeState(nodeConfig.nodeId, { lastEmissionTime: newTime });
        }
      }

      // Process ProcessNode nodes
      if (nodeConfig.type === "ProcessNode") {
        const pnConfig = nodeConfig;
        const pnState = currentNodeState as ProcessNodeState;
        let canFire = true;
        const inputsDataForFormula: Record<string, Token> = {};

        for (const inputSourceNodeId of pnConfig.inputNodeIds) {
          const sourceNodeConfig = nodesConfig[inputSourceNodeId];
          if (!sourceNodeConfig) {
            canFire = false;
            break;
          }

          if (sourceNodeConfig.type === "Queue") {
            const qState = get().nodeStates[inputSourceNodeId] as QueueState;
            if (qState.outputBuffer.length > 0) {
              inputsDataForFormula[inputSourceNodeId] = qState.outputBuffer[0];
            } else {
              canFire = false;
              break;
            }
          } else {
            if (pnState.inputBuffers[inputSourceNodeId] && pnState.inputBuffers[inputSourceNodeId].length > 0) {
              inputsDataForFormula[inputSourceNodeId] = pnState.inputBuffers[inputSourceNodeId][0];
            } else {
              canFire = false;
              break;
            }
          }
        }

        if (canFire) {
          const consumedTokensForThisFiring: Token[] = [];
          const nextPnInputBuffers = JSON.parse(JSON.stringify(pnState.inputBuffers));

          Object.entries(inputsDataForFormula).forEach(([inputNodeId, tokenToConsume]) => {
            consumedTokensForThisFiring.push(tokenToConsume);
            const consumptionLogDetails = `From ${nodesConfig[inputNodeId]?.displayName || inputNodeId}, Token ${tokenToConsume.id}`;
            const consumptionLog = _logNodeActivity(
              pnConfig.nodeId,
              {
                action: "INPUT_TOKEN_CONSUMED_BY_PROCESSOR",
                value: tokenToConsume.value,
                details: consumptionLogDetails,
              },
              newTime,
            );
            tokenToConsume.history.push(consumptionLog);

            const sourceNodeConfig = nodesConfig[inputNodeId];
            if (sourceNodeConfig.type === "Queue") {
              const qState = get().nodeStates[inputNodeId] as QueueState;
              _updateNodeState(inputNodeId, { outputBuffer: qState.outputBuffer.slice(1) });
            } else {
              const buffer = (nextPnInputBuffers[inputNodeId] as Token[]) || [];
              buffer.shift();
              nextPnInputBuffers[inputNodeId] = buffer;
            }
          });
          _updateNodeState(pnConfig.nodeId, { inputBuffers: nextPnInputBuffers, lastFiredTime: newTime });

          const formulaContext: Record<string, any> = { inputs: {} };
          Object.entries(inputsDataForFormula).forEach(([node_id, token]) => {
            formulaContext.inputs[node_id] = { value: token.value };
          });

          pnConfig.outputs.forEach((output, index) => {
            const { value: outputValue, error } = evaluateFormula(output.formula, formulaContext);
            if (error) {
              _logNodeActivity(
                pnConfig.nodeId,
                {
                  action: "FORMULA_ERROR",
                  details: `Output ${index} ('${output.formula}'): ${error}. Context: ${JSON.stringify(formulaContext)}`,
                  operationType: "transformation",
                },
                newTime,
              );
              set(stateFS => ({
                errorMessages: [
                  ...stateFS.errorMessages,
                  `Node ${pnConfig.displayName} (output ${index}) formula error: ${error}`,
                ],
              }));
            } else {
              const newToken = _createToken(pnConfig.nodeId, outputValue, newTime, consumedTokensForThisFiring);

              // Create detailed transformation breakdown
              const transformationDetails = createTransformationDetails(
                output.formula,
                formulaContext.inputs,
                outputValue,
              );

              // Create lineage metadata for transformation
              const lineageMetadata = createLineageMetadata("transformation", consumedTokensForThisFiring, newToken.id);

              // Enhanced source token summaries
              const enhancedSourceTokenSummaries = createEnhancedSourceTokenSummaries(consumedTokensForThisFiring);

              _logNodeActivity(
                pnConfig.nodeId,
                {
                  action: "OUTPUT_GENERATED",
                  value: newToken.value,
                  sourceTokenIds: consumedTokensForThisFiring.map(t => t.id),
                  sourceTokenSummaries: enhancedSourceTokenSummaries,
                  details: `${transformationDetails.calculation}. Token ${newToken.id} for output ${index} to ${output.destinationNodeId}`,
                  transformationDetails,
                  lineageMetadata,
                },
                newTime,
              );

              const destNodeConfig = nodesConfig[output.destinationNodeId];
              if (destNodeConfig) {
                const destNodeState = get().nodeStates[destNodeConfig.nodeId];
                const arrivalLogDetails = `Token ${newToken.id} from ${pnConfig.displayName} output ${index}`;
                const arrivalLog = _logNodeActivity(
                  destNodeConfig.nodeId,
                  { action: "TOKEN_ARRIVED_AT_NODE", value: newToken.value, details: arrivalLogDetails },
                  newTime,
                );
                newToken.history.push(arrivalLog);

                if (destNodeConfig.type === "Queue") {
                  const qState = destNodeState as QueueState;
                  if (destNodeConfig.capacity && qState.inputBuffer.length >= destNodeConfig.capacity) {
                    const dropLog = _logNodeActivity(
                      destNodeConfig.nodeId,
                      {
                        action: "DROPPED_AT_QUEUE_INPUT_FULL",
                        value: newToken.value,
                        details: `From ${pnConfig.displayName}, Token ${newToken.id}`,
                      },
                      newTime,
                    );
                    newToken.history.push(dropLog);
                  } else {
                    _updateNodeState(destNodeConfig.nodeId, { inputBuffer: [...qState.inputBuffer, newToken] });
                    _logNodeActivity(
                      destNodeConfig.nodeId,
                      {
                        action: "TOKEN_ADDED_TO_INPUT_BUFFER",
                        value: newToken.value,
                        details: `From ${pnConfig.displayName}. New size: ${qState.inputBuffer.length + 1}`,
                      },
                      newTime,
                    );
                  }
                } else if (destNodeConfig.type === "ProcessNode") {
                  const nextDestPnState = destNodeState as ProcessNodeState;
                  const bufferForInput = nextDestPnState.inputBuffers[pnConfig.nodeId] || [];
                  _updateNodeState(destNodeConfig.nodeId, {
                    inputBuffers: { ...nextDestPnState.inputBuffers, [pnConfig.nodeId]: [...bufferForInput, newToken] },
                  });
                  _logNodeActivity(
                    destNodeConfig.nodeId,
                    {
                      action: "TOKEN_ADDED_TO_INPUT_BUFFER",
                      value: newToken.value,
                      details: `From ${pnConfig.displayName} into buffer for ${pnConfig.nodeId}. New size: ${bufferForInput.length + 1}`,
                    },
                    newTime,
                  );
                } else if (destNodeConfig.type === "Sink") {
                  const sinkState = destNodeState as SinkState;
                  const updatedConsumedTokens = [...(sinkState.consumedTokens || []), newToken].slice(
                    -MAX_SINK_TOKENS_STORED,
                  );
                  _updateNodeState(destNodeConfig.nodeId, {
                    consumedTokenCount: (sinkState.consumedTokenCount || 0) + 1,
                    lastConsumedTime: newTime,
                    consumedTokens: updatedConsumedTokens,
                  });
                  const sinkConsumptionLog = _logNodeActivity(
                    destNodeConfig.nodeId,
                    { action: "CONSUMED_BY_SINK_NODE", value: newToken.value, details: arrivalLogDetails },
                    newTime,
                  );
                  newToken.history.push(sinkConsumptionLog);
                }
              }
            }
          });
        }
      }
    });

    // Process Queue aggregation
    Object.values(nodesConfig).forEach(nodeConfig => {
      if (nodeConfig.type === "Queue") {
        const qConfig = nodeConfig;
        const qState = get().nodeStates[qConfig.nodeId] as QueueState;

        if (newTime >= (qState.lastAggregationTime < 0 ? 0 : qState.lastAggregationTime) + qConfig.timeWindow) {
          if (qState.inputBuffer.length > 0) {
            const tokensToAggregate = [...qState.inputBuffer];
            let aggregatedValue: any;
            const sourceTokenIdsForLog = tokensToAggregate.map(t => t.id);
            const sourceTokenSummariesForLog = tokensToAggregate.map(t => ({
              id: t.id,
              originNodeId: t.originNodeId,
              originalValue: t.value,
              createdAt: t.createdAt,
            }));

            switch (qConfig.aggregationMethod) {
              case "sum":
                aggregatedValue = tokensToAggregate.reduce((sum, t) => sum + Number(t.value), 0);
                break;
              case "average":
                aggregatedValue =
                  tokensToAggregate.length > 0
                    ? tokensToAggregate.reduce((sum, t) => sum + Number(t.value), 0) / tokensToAggregate.length
                    : 0;
                break;
              case "count":
                aggregatedValue = tokensToAggregate.length;
                break;
              case "first":
                aggregatedValue = tokensToAggregate[0]?.value;
                break;
              case "last":
                aggregatedValue = tokensToAggregate[tokensToAggregate.length - 1]?.value;
                break;
              default:
                aggregatedValue = tokensToAggregate[0]?.value;
            }

            if (aggregatedValue !== undefined) {
              const newToken = _createToken(qConfig.nodeId, aggregatedValue, newTime, tokensToAggregate);

              // Create detailed aggregation breakdown
              const aggregationDetails = createAggregationDetails(
                qConfig.aggregationMethod,
                tokensToAggregate,
                aggregatedValue,
              );

              // Create lineage metadata for aggregation
              const lineageMetadata = createLineageMetadata("aggregation", tokensToAggregate, newToken.id);

              // Enhanced source token summaries
              const enhancedSourceTokenSummaries = createEnhancedSourceTokenSummaries(tokensToAggregate);

              tokensToAggregate.forEach(consumedToken => {
                const aggConsumptionLogDetails = `Token ${consumedToken.id} from input buffer for aggregation by ${qConfig.displayName}`;
                const aggConsumptionLog = _logNodeActivity(
                  qConfig.nodeId,
                  {
                    action: "TOKEN_CONSUMED_FOR_AGGREGATION",
                    value: consumedToken.value,
                    details: aggConsumptionLogDetails,
                    operationType: "consumption",
                  },
                  newTime,
                );
                consumedToken.history.push(aggConsumptionLog);
              });

              _logNodeActivity(
                qConfig.nodeId,
                {
                  action: `AGGREGATED_${qConfig.aggregationMethod.toUpperCase()}`,
                  value: newToken.value,
                  sourceTokenIds: sourceTokenIdsForLog,
                  sourceTokenSummaries: enhancedSourceTokenSummaries,
                  details: `${aggregationDetails.calculation}. Token ${newToken.id} placed in output buffer for ${qConfig.destinationNodeId}`,
                  aggregationDetails,
                  lineageMetadata,
                },
                newTime,
              );

              _updateNodeState(qConfig.nodeId, {
                inputBuffer: [],
                outputBuffer: [...qState.outputBuffer, newToken],
                lastAggregationTime: newTime,
              });
            } else {
              _logNodeActivity(
                qConfig.nodeId,
                {
                  action: "AGGREGATION_EMPTY_VALUE",
                  details: `Input buffer cleared. Contained ${tokensToAggregate.length} tokens.`,
                },
                newTime,
              );
              _updateNodeState(qConfig.nodeId, { inputBuffer: [], lastAggregationTime: newTime });
            }
          } else {
            _logNodeActivity(
              qConfig.nodeId,
              { action: "AGGREGATION_WINDOW_PASSED_EMPTY_INPUT", details: `No tokens in input buffer.` },
              newTime,
            );
            _updateNodeState(qConfig.nodeId, { lastAggregationTime: newTime });
          }
        }
      }
    });

    // Forward tokens from Queue output buffers
    Object.values(nodesConfig).forEach(nodeConfig => {
      if (nodeConfig.type === "Queue") {
        const qConfigSource = nodeConfig;
        const qStateSource = get().nodeStates[qConfigSource.nodeId] as QueueState;

        if (qStateSource.outputBuffer.length > 0) {
          const destNodeConfig = nodesConfig[qConfigSource.destinationNodeId];
          if (destNodeConfig) {
            const tokenToForward = qStateSource.outputBuffer[0];
            const transferLogDetails = `Token ${tokenToForward.id} from ${qConfigSource.displayName} output`;
            const forwardActionLog = _logNodeActivity(
              qConfigSource.nodeId,
              {
                action: "TOKEN_FORWARDED_FROM_OUTPUT",
                value: tokenToForward.value,
                details: `To ${destNodeConfig.displayName}`,
              },
              newTime,
            );
            tokenToForward.history.push(forwardActionLog);

            if (destNodeConfig.type === "Sink") {
              const sinkNodeState = get().nodeStates[destNodeConfig.nodeId] as SinkState;
              const updatedConsumedTokensSink = [...(sinkNodeState.consumedTokens || []), tokenToForward].slice(
                -MAX_SINK_TOKENS_STORED,
              );
              _updateNodeState(destNodeConfig.nodeId, {
                consumedTokenCount: (sinkNodeState.consumedTokenCount || 0) + 1,
                lastConsumedTime: newTime,
                consumedTokens: updatedConsumedTokensSink,
              });
              const sinkConsumptionLog = _logNodeActivity(
                destNodeConfig.nodeId,
                { action: "CONSUMED_BY_SINK_NODE", value: tokenToForward.value, details: transferLogDetails },
                newTime,
              );
              tokenToForward.history.push(sinkConsumptionLog);
              _updateNodeState(qConfigSource.nodeId, { outputBuffer: qStateSource.outputBuffer.slice(1) });
            } else if (destNodeConfig.type === "Queue") {
              const qStateDest = get().nodeStates[destNodeConfig.nodeId] as QueueState;
              const arrivalLog = _logNodeActivity(
                destNodeConfig.nodeId,
                { action: "TOKEN_ARRIVED_AT_NODE", value: tokenToForward.value, details: transferLogDetails },
                newTime,
              );
              tokenToForward.history.push(arrivalLog);

              if (destNodeConfig.capacity && qStateDest.inputBuffer.length >= destNodeConfig.capacity) {
                const dropLog = _logNodeActivity(
                  destNodeConfig.nodeId,
                  {
                    action: "DROPPED_AT_QUEUE_INPUT_FULL",
                    value: tokenToForward.value,
                    details: `Token ${tokenToForward.id} from ${qConfigSource.displayName}`,
                  },
                  newTime,
                );
                tokenToForward.history.push(dropLog);
              } else {
                _updateNodeState(destNodeConfig.nodeId, { inputBuffer: [...qStateDest.inputBuffer, tokenToForward] });
                _logNodeActivity(
                  destNodeConfig.nodeId,
                  {
                    action: "TOKEN_ADDED_TO_INPUT_BUFFER",
                    value: tokenToForward.value,
                    details: `From ${qConfigSource.displayName}. New size: ${qStateDest.inputBuffer.length + 1}`,
                  },
                  newTime,
                );
              }
              _updateNodeState(qConfigSource.nodeId, { outputBuffer: qStateSource.outputBuffer.slice(1) });
            }
          }
        }
      }
    });
  },

  setSelectedNodeId: nodeId => set({ selectedNodeId: nodeId, selectedToken: null }),
  setSelectedToken: token => set({ selectedToken: token, selectedNodeId: null }),
  clearErrors: () => set({ errorMessages: [] }),
  toggleGlobalLedger: () => set(state => ({ isGlobalLedgerOpen: !state.isGlobalLedgerOpen })),

  updateNodeConfigInStore: (nodeId, newConfigData) => {
    // Simplified implementation for now
    return true;
  },

  _updateNodeState: (nodeId, partialState) => {
    set(state => ({
      nodeStates: {
        ...state.nodeStates,
        [nodeId]: { ...state.nodeStates[nodeId], ...partialState },
      },
    }));
  },

  _logNodeActivity: (nodeIdForLog, logCoreDetails, timestamp) => {
    const currentSequence = get().eventCounter;
    set(stateFS => ({ eventCounter: stateFS.eventCounter + 1 }));

    // Determine operation type from action
    const operationType = determineOperationType(logCoreDetails.action);

    const newEntry: HistoryEntry = {
      timestamp: timestamp,
      epochTimestamp: Date.now(),
      sequence: currentSequence,
      nodeId: nodeIdForLog,
      action: logCoreDetails.action,
      value: logCoreDetails.value,
      sourceTokenIds: logCoreDetails.sourceTokenIds,
      sourceTokenSummaries: logCoreDetails.sourceTokenSummaries,
      details: logCoreDetails.details,
      operationType,
      // Enhanced fields will be added by specific operations
      aggregationDetails: (logCoreDetails as any).aggregationDetails,
      transformationDetails: (logCoreDetails as any).transformationDetails,
      lineageMetadata: (logCoreDetails as any).lineageMetadata,
    };

    set(state => {
      if (!nodeIdForLog || typeof nodeIdForLog !== "string") {
        console.error(
          `[${timestamp}s] SIMULATION ERROR: Attempted to log activity with invalid nodeIdForLog: ${nodeIdForLog}. Action: ${logCoreDetails.action}, Details: ${logCoreDetails.details}`,
        );
        const currentErrors = state.errorMessages || [];
        return { ...state, errorMessages: [`Logging error: Invalid nodeIdForLog: ${nodeIdForLog}`, ...currentErrors] };
      }

      const currentNodeLogs = state.nodeActivityLogs[nodeIdForLog] || [];
      const updatedNodeLogs = [...currentNodeLogs, newEntry].slice(-MAX_NODE_ACTIVITY_LOGS);
      const newNodeActivityLogs = {
        ...state.nodeActivityLogs,
        [nodeIdForLog]: updatedNodeLogs,
      };

      const currentGlobalLog = state.globalActivityLog || [];
      const updatedGlobalLog = [...currentGlobalLog, newEntry].slice(-MAX_GLOBAL_ACTIVITY_LOGS);

      return { ...state, nodeActivityLogs: newNodeActivityLogs, globalActivityLog: updatedGlobalLog };
    });
    return newEntry;
  },

  _createToken: (originNodeId, value, timestamp, sourceTokens: Token[] = []) => {
    const newToken: Token = {
      id: nanoid(8),
      value,
      createdAt: timestamp,
      originNodeId,
      history: [],
    };

    const sourceTokenIds = sourceTokens.map(t => t.id);

    // Create enhanced source token summaries with recursive lineage
    const sourceTokenSummaries = createEnhancedSourceTokenSummaries(sourceTokens);

    // Create lineage metadata for this token creation
    const lineageMetadata = createLineageMetadata("creation", sourceTokens, newToken.id);

    const createLog = get()._logNodeActivity(
      originNodeId,
      {
        action: "CREATED",
        value: newToken.value,
        sourceTokenIds,
        sourceTokenSummaries,
        details: `Token ${newToken.id}`,
        lineageMetadata,
      },
      timestamp,
    );
    newToken.history.push(createLog);
    return newToken;
  },
}));
