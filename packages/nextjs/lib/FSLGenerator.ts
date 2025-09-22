// CONFIG-DRIVEN FINITE STATE MACHINE ENGINE
// Pure FSM that only knows states+events, with runtime variable tracking

export interface NodeConfig {
  nodeId: string;
  type: string;
  capacity?: number;
  aggregation?: {
    method: string;
    formula: string;
    trigger: {
      type: 'time' | 'capacity' | 'count';
      window?: number;
      threshold?: number;
    };
  };
}

export interface LogEvent {
  timestamp: number;
  action: string;
  value?: number;
  state?: string;
  details?: string;
}

export interface FSLTransition {
  from: string;
  event: string;
  to: string;
  condition?: string;
}

export interface FSLStateMachine {
  states: string[];
  transitions: FSLTransition[];
  initialState: string;
  fsl: string;
}

// Runtime state tracking
export interface RuntimeState {
  currentState: string;
  buffer_size: number;
  output_buffer_size: number;
  time_anchor?: number;
  variables: Record<string, any>;
}

// FSM-AUTHORITATIVE log entry - NO trust of input log state
export interface AnnotatedLogEntry {
  timestamp: number;
  raw_action: string;
  raw_value?: number;
  state_before: string;        // FSM-computed ONLY
  event?: string;              // Normalized event name
  state_after: string;         // FSM-computed ONLY
  buffer_before: number;       // FSM-tracked ONLY
  buffer_after: number;        // FSM-tracked ONLY
  output_buffer_before: number; // FSM-tracked ONLY
  output_buffer_after: number;  // FSM-tracked ONLY
  derived_events: string[];    // Events emitted by runtime
  time_anchor?: number;        // FSM variable
  notes: string[];             // Processing details
  consistency_errors: string[]; // FSM validation errors
}

// FSM Analysis Result
export interface FSMAnalysisResult {
  specialized_fsl: string;
  transition_table: FSLTransition[];
  annotated_trace: AnnotatedLogEntry[];
  consistency_report: {
    total_events: number;
    successful_transitions: number;
    failed_transitions: number;
    errors: string[];
    warnings: string[];
  };
  final_state: RuntimeState;
}

export class FSLGenerator {

  /**
   * CANONICAL EVENTS - Fixed IDs for pure FSM
   */
  private static readonly CANONICAL_EVENTS = {
    TOKEN_RECEIVED: 'token_received',
    CAPACITY_REACHED: 'capacity_reached',
    TIME_WINDOW_ELAPSED: 'time_window_elapsed',
    AGGREGATION_COMPLETE: 'aggregation_complete',
    TOKEN_SENT: 'token_sent',
    INTERVAL_REACHED: 'interval_reached',
    TOKEN_CREATED: 'token_created',
    EMISSION_COMPLETE: 'emission_complete',
    INPUTS_READY: 'inputs_ready',
    CALCULATION_COMPLETE: 'calculation_complete',
    OUTPUTS_COMPLETE: 'outputs_complete',
    CONSUMPTION_COMPLETE: 'consumption_complete'
  };

  /**
   * CANONICAL STATES - Fixed IDs for each node type
   */
  private static readonly CANONICAL_STATES = {
    Queue: ['queue_idle', 'queue_accumulating', 'queue_processing', 'queue_emitting'],
    DataSource: ['source_idle', 'source_generating', 'source_emitting'],
    ProcessNode: ['process_idle', 'process_collecting', 'process_calculating', 'process_emitting'],
    Sink: ['sink_idle', 'sink_processing']
  };

  /**
   * Raw log action to canonical event mapping
   */
  private static readonly LOG_TO_EVENT_MAP: Record<string, string> = {
    'RECEIVE_TOKEN': 'token_received',
    'TOKEN_CONSUMED_FOR_AGGREGATION': 'consume_token',
    'AGGREGATED_SUM': 'aggregation_complete',
    'AGGREGATED_AVERAGE': 'aggregation_complete',
    'AGGREGATED_COUNT': 'aggregation_complete',
    'TOKEN_FORWARDED_FROM_OUTPUT': 'token_sent',
    'EMIT_TOKEN': 'token_created',
    'CONSUME_TOKEN': 'token_received',
    'START_PROCESSING': 'inputs_ready',
    'COMPLETE_PROCESSING': 'calculation_complete',
    'AGGREGATION_WINDOW_PASSED_EMPTY_INPUT': 'time_window_elapsed'
  };

  /**
   * Generate config-specialized FSL for a node
   */
  static generateForNodeConfig(config: NodeConfig): FSLStateMachine {
    switch (config.type) {
      case 'Queue':
        return this.generateQueueFSL(config);
      case 'DataSource':
        return this.generateDataSourceFSL(config);
      case 'ProcessNode':
        return this.generateProcessNodeFSL(config);
      case 'Sink':
        return this.generateSinkFSL(config);
      default:
        throw new Error(`Unknown node type: ${config.type}`);
    }
  }

  /**
   * Generate Queue FSL - PURE template specialized by config
   */
  private static generateQueueFSL(config: NodeConfig): FSLStateMachine {
    const states = this.CANONICAL_STATES.Queue;
    const transitions: FSLTransition[] = [];

    // Core transitions (always present)
    transitions.push({
      from: 'queue_idle',
      event: this.CANONICAL_EVENTS.TOKEN_RECEIVED,
      to: 'queue_accumulating'
    });

    transitions.push({
      from: 'queue_accumulating',
      event: this.CANONICAL_EVENTS.TOKEN_RECEIVED,
      to: 'queue_accumulating'
    });

    // Config-specialized transitions
    if (config.aggregation?.trigger.type === 'capacity' || config.capacity) {
      transitions.push({
        from: 'queue_accumulating',
        event: this.CANONICAL_EVENTS.CAPACITY_REACHED,
        to: 'queue_processing'
      });
    }

    if (config.aggregation?.trigger.type === 'time') {
      transitions.push({
        from: 'queue_accumulating',
        event: this.CANONICAL_EVENTS.TIME_WINDOW_ELAPSED,
        to: 'queue_processing'
      });
    }

    // Processing -> Emitting
    transitions.push({
      from: 'queue_processing',
      event: this.CANONICAL_EVENTS.AGGREGATION_COMPLETE,
      to: 'queue_emitting'
    });

    // Emitting transitions with guards
    transitions.push({
      from: 'queue_emitting',
      event: this.CANONICAL_EVENTS.TOKEN_SENT,
      to: 'queue_idle',
      condition: 'buffer_empty'
    });

    transitions.push({
      from: 'queue_emitting',
      event: this.CANONICAL_EVENTS.TOKEN_SENT,
      to: 'queue_accumulating',
      condition: 'buffer_not_empty'
    });

    const fsl = this.generateFSLSyntax(transitions);

    return {
      states,
      transitions,
      initialState: 'queue_idle',
      fsl
    };
  }

  /**
   * Generate DataSource FSL
   */
  private static generateDataSourceFSL(config: NodeConfig): FSLStateMachine {
    const states = this.CANONICAL_STATES.DataSource;
    const transitions: FSLTransition[] = [
      {
        from: 'source_idle',
        event: this.CANONICAL_EVENTS.INTERVAL_REACHED,
        to: 'source_generating'
      },
      {
        from: 'source_generating',
        event: this.CANONICAL_EVENTS.TOKEN_CREATED,
        to: 'source_emitting'
      },
      {
        from: 'source_emitting',
        event: this.CANONICAL_EVENTS.EMISSION_COMPLETE,
        to: 'source_idle'
      }
    ];

    return {
      states,
      transitions,
      initialState: 'source_idle',
      fsl: this.generateFSLSyntax(transitions)
    };
  }

  /**
   * Generate ProcessNode FSL
   */
  private static generateProcessNodeFSL(config: NodeConfig): FSLStateMachine {
    const states = this.CANONICAL_STATES.ProcessNode;
    const transitions: FSLTransition[] = [
      {
        from: 'process_idle',
        event: this.CANONICAL_EVENTS.TOKEN_RECEIVED,
        to: 'process_collecting'
      },
      {
        from: 'process_collecting',
        event: this.CANONICAL_EVENTS.TOKEN_RECEIVED,
        to: 'process_collecting'
      },
      {
        from: 'process_collecting',
        event: this.CANONICAL_EVENTS.INPUTS_READY,
        to: 'process_calculating'
      },
      {
        from: 'process_calculating',
        event: this.CANONICAL_EVENTS.CALCULATION_COMPLETE,
        to: 'process_emitting'
      },
      {
        from: 'process_emitting',
        event: this.CANONICAL_EVENTS.OUTPUTS_COMPLETE,
        to: 'process_idle'
      }
    ];

    return {
      states,
      transitions,
      initialState: 'process_idle',
      fsl: this.generateFSLSyntax(transitions)
    };
  }

  /**
   * Generate Sink FSL
   */
  private static generateSinkFSL(config: NodeConfig): FSLStateMachine {
    const states = this.CANONICAL_STATES.Sink;
    const transitions: FSLTransition[] = [
      {
        from: 'sink_idle',
        event: this.CANONICAL_EVENTS.TOKEN_RECEIVED,
        to: 'sink_processing'
      },
      {
        from: 'sink_processing',
        event: this.CANONICAL_EVENTS.CONSUMPTION_COMPLETE,
        to: 'sink_idle'
      }
    ];

    return {
      states,
      transitions,
      initialState: 'sink_idle',
      fsl: this.generateFSLSyntax(transitions)
    };
  }

  /**
   * Generate FSL syntax from transitions
   */
  private static generateFSLSyntax(transitions: FSLTransition[]): string {
    return transitions
      .map(t => {
        const condition = t.condition ? ` [${t.condition}]` : '';
        return `${t.from} '${t.event}'${condition} -> ${t.to};`;
      })
      .join('\n');
  }

  /**
   * MAIN ANALYSIS ENGINE - Analyzes logs against config-driven FSM
   */
  static analyzeLogSequence(config: NodeConfig, logs: LogEvent[]): FSMAnalysisResult {
    const stateMachine = this.generateForNodeConfig(config);

    // Initialize runtime state
    const runtime: RuntimeState = {
      currentState: stateMachine.initialState,
      buffer_size: 0,
      output_buffer_size: 0,
      variables: {}
    };

    const annotated: AnnotatedLogEntry[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let successful_transitions = 0;
    let failed_transitions = 0;

    // Process each log entry
    for (const log of logs) {
      const entry = this.processLogEntry(log, runtime, stateMachine, config);
      annotated.push(entry);

      if (entry.consistency_errors.length > 0) {
        failed_transitions++;
        errors.push(...entry.consistency_errors);
      } else {
        successful_transitions++;
      }
    }

    return {
      specialized_fsl: stateMachine.fsl,
      transition_table: stateMachine.transitions,
      annotated_trace: annotated,
      consistency_report: {
        total_events: logs.length,
        successful_transitions,
        failed_transitions,
        errors,
        warnings
      },
      final_state: runtime
    };
  }

  /**
   * Process a single log entry through FSM - AUTHORITATIVE STATE TRACKING
   * IGNORES any "state" field in input log - FSM is single source of truth
   */
  private static processLogEntry(
    log: LogEvent,
    runtime: RuntimeState,
    stateMachine: FSLStateMachine,
    config: NodeConfig
  ): AnnotatedLogEntry {
    // STEP 1: Capture FSM state BEFORE processing this event
    const entry: AnnotatedLogEntry = {
      timestamp: log.timestamp,
      raw_action: log.action,
      raw_value: log.value,
      state_before: runtime.currentState,    // FSM-authoritative
      state_after: runtime.currentState,     // Will be updated
      buffer_before: runtime.buffer_size,    // FSM-tracked
      buffer_after: runtime.buffer_size,     // Will be updated
      output_buffer_before: runtime.output_buffer_size,
      output_buffer_after: runtime.output_buffer_size,
      derived_events: [],
      time_anchor: runtime.time_anchor,
      notes: [],
      consistency_errors: []
    };

    // STEP 2: Update runtime variables based on raw action
    this.updateRuntimeVariables(log, runtime, config, entry);

    // STEP 3: Normalize raw action to canonical event
    const normalizedEvent = this.normalizeLogEvent(log);
    if (normalizedEvent) {
      entry.event = normalizedEvent;
    }

    // STEP 4: Generate derived events from current runtime state
    const derivedEvents = this.generateDerivedEvents(runtime, config, log);
    entry.derived_events = derivedEvents;

    // STEP 5: Process normalized event through FSM
    if (normalizedEvent) {
      this.processEventThroughFSM(normalizedEvent, runtime, stateMachine, entry);
    }

    // STEP 6: Process derived events through FSM
    for (const derivedEvent of derivedEvents) {
      this.processEventThroughFSM(derivedEvent, runtime, stateMachine, entry);
    }

    // STEP 7: Finalize FSM-authoritative state
    entry.state_after = runtime.currentState;
    entry.buffer_after = runtime.buffer_size;
    entry.output_buffer_after = runtime.output_buffer_size;
    entry.time_anchor = runtime.time_anchor;

    return entry;
  }

  /**
   * Process a single event through the FSM - updates runtime state
   */
  private static processEventThroughFSM(
    event: string,
    runtime: RuntimeState,
    stateMachine: FSLStateMachine,
    entry: AnnotatedLogEntry
  ): void {
    const transition = this.findValidTransition(runtime.currentState, event, runtime, stateMachine);

    if (transition) {
      const previousState = runtime.currentState;
      runtime.currentState = transition.to;
      entry.notes.push(`${event}: ${previousState} -> ${transition.to}`);

      // Handle state-specific side effects
      this.handleStateTransitionSideEffects(transition, runtime, entry);
    } else {
      // Only error for events that should cause transitions
      if (event !== 'consume_token') {
        entry.consistency_errors.push(`No valid transition from ${runtime.currentState} for event '${event}'`);
      }
    }
  }

  /**
   * Normalize raw log action to canonical event
   */
  private static normalizeLogEvent(log: LogEvent): string | null {
    return this.LOG_TO_EVENT_MAP[log.action] || null;
  }

  /**
   * Update runtime variables based on raw log action - FSM AUTHORITATIVE
   */
  private static updateRuntimeVariables(
    log: LogEvent,
    runtime: RuntimeState,
    config: NodeConfig,
    entry: AnnotatedLogEntry
  ): void {
    switch (log.action) {
      case 'RECEIVE_TOKEN':
        runtime.buffer_size++;
        entry.notes.push(`Token received: buffer ${runtime.buffer_size - 1} -> ${runtime.buffer_size}`);

        // Set time anchor when transitioning into accumulating
        if (runtime.currentState === 'queue_idle' && !runtime.time_anchor) {
          runtime.time_anchor = log.timestamp;
          entry.notes.push(`Set time_anchor to ${log.timestamp}s`);
        }
        break;

      case 'TOKEN_CONSUMED_FOR_AGGREGATION':
        if (runtime.buffer_size > 0) {
          runtime.buffer_size--;
          entry.notes.push(`Token consumed: buffer ${runtime.buffer_size + 1} -> ${runtime.buffer_size}`);
        } else {
          entry.consistency_errors.push('Cannot consume token: buffer already empty');
        }
        break;

      case 'TOKEN_FORWARDED_FROM_OUTPUT':
        if (runtime.output_buffer_size > 0) {
          runtime.output_buffer_size--;
          entry.notes.push(`Output token sent: output_buffer ${runtime.output_buffer_size + 1} -> ${runtime.output_buffer_size}`);
        } else {
          entry.consistency_errors.push('Cannot send token: output buffer already empty');
        }
        break;

      case 'AGGREGATED_SUM':
      case 'AGGREGATED_AVERAGE':
      case 'AGGREGATED_COUNT':
        runtime.output_buffer_size++;
        entry.notes.push(`Aggregation created output token: ${log.value} (output_buffer: ${runtime.output_buffer_size - 1} -> ${runtime.output_buffer_size})`);
        break;

      case 'EMIT_TOKEN':
        runtime.output_buffer_size++;
        entry.notes.push(`Token generated: ${log.value}`);
        break;
    }
  }

  /**
   * Generate derived events from runtime state
   */
  private static generateDerivedEvents(
    runtime: RuntimeState,
    config: NodeConfig,
    log: LogEvent
  ): string[] {
    const derived: string[] = [];

    // Capacity-based triggers
    if (config.capacity && runtime.buffer_size >= config.capacity &&
        runtime.currentState === 'queue_accumulating') {
      derived.push(this.CANONICAL_EVENTS.CAPACITY_REACHED);
    }

    // Time-based triggers
    if (config.aggregation?.trigger.type === 'time' && runtime.time_anchor) {
      const window = config.aggregation.trigger.window || 0;
      if (log.timestamp >= runtime.time_anchor + window &&
          runtime.buffer_size > 0 &&
          runtime.currentState === 'queue_accumulating') {
        derived.push(this.CANONICAL_EVENTS.TIME_WINDOW_ELAPSED);
      }
    }

    return derived;
  }

  /**
   * Find valid FSM transition
   */
  private static findValidTransition(
    currentState: string,
    event: string,
    runtime: RuntimeState,
    stateMachine: FSLStateMachine
  ): FSLTransition | null {
    return stateMachine.transitions.find(t => {
      if (t.from !== currentState || t.event !== event) return false;

      // Check guards
      if (t.condition === 'buffer_empty' && runtime.buffer_size > 0) return false;
      if (t.condition === 'buffer_not_empty' && runtime.buffer_size === 0) return false;

      return true;
    }) || null;
  }

  /**
   * Handle side effects of state transitions - FSM AUTHORITATIVE
   */
  private static handleStateTransitionSideEffects(
    transition: FSLTransition,
    runtime: RuntimeState,
    entry: AnnotatedLogEntry
  ): void {
    // Reset time anchor when leaving accumulating state
    if (transition.from === 'queue_accumulating' && transition.to !== 'queue_accumulating') {
      if (runtime.time_anchor) {
        runtime.time_anchor = undefined;
        entry.notes.push('Reset time_anchor (left accumulating state)');
      }
    }

    // Set time anchor when entering accumulating state
    if (transition.to === 'queue_accumulating' && transition.from !== 'queue_accumulating') {
      runtime.time_anchor = entry.timestamp;
      entry.notes.push(`Set time_anchor to ${entry.timestamp}s (entered accumulating state)`);
    }
  }

  /**
   * Legacy compatibility - Generate simple analysis string
   */
  static generateAnalysis(config: NodeConfig, logs: LogEvent[]): string {
    const result = this.analyzeLogSequence(config, logs);

    let analysis = `## FSM Analysis for ${config.nodeId}\n\n`;
    analysis += `### Specialized FSL\n\`\`\`\n${result.specialized_fsl}\n\`\`\`\n\n`;
    analysis += `### Consistency Report\n`;
    analysis += `- Total Events: ${result.consistency_report.total_events}\n`;
    analysis += `- Successful: ${result.consistency_report.successful_transitions}\n`;
    analysis += `- Failed: ${result.consistency_report.failed_transitions}\n`;

    if (result.consistency_report.errors.length > 0) {
      analysis += `\n**Errors:**\n`;
      result.consistency_report.errors.forEach(error => {
        analysis += `- ${error}\n`;
      });
    }

    return analysis;
  }

  /**
   * Legacy compatibility - kept for existing code
   */
  static mapEventToTransition(event: LogEvent): { event: string; condition?: string } | null {
    const mapped = this.normalizeLogEvent(event);
    return mapped ? { event: mapped } : null;
  }

  /**
   * Legacy compatibility - kept for existing code
   */
  static validateLogSequence(
    stateMachine: FSLStateMachine,
    logs: LogEvent[]
  ): { valid: boolean; errors: string[]; stateProgression: Array<{ event: LogEvent; expectedState: string; actualState?: string }> } {
    // Simple implementation for backwards compatibility
    return {
      valid: true,
      errors: [],
      stateProgression: logs.map(log => ({
        event: log,
        expectedState: stateMachine.initialState,
        actualState: log.state
      }))
    };
  }
}