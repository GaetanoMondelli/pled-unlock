/**
 * Composable State Machine Components Library
 *
 * This library provides reusable state machine components that can be composed
 * together to build complex workflows. Each component is self-contained and
 * configurable, allowing for maximum flexibility and reusability.
 */

export interface StateMachineComponent {
  id: string;
  name: string;
  description: string;
  category: ComponentCategory;
  inputs: ComponentPort[];
  outputs: ComponentPort[];
  config: ComponentConfig;
  stateMachine: ComponentStateMachine;
  version: string;
  author?: string;
  tags: string[];
}

export interface ComponentPort {
  id: string;
  name: string;
  type: PortType;
  dataSchema: Record<string, any>;
  required: boolean;
  description?: string;
}

export interface ComponentConfig {
  parameters: Record<string, ConfigParameter>;
  triggers: TriggerConfig[];
  outputs: OutputConfig[];
}

export interface ConfigParameter {
  type: "string" | "number" | "boolean" | "select" | "multiselect" | "datetime" | "duration";
  defaultValue?: any;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    required?: boolean;
  };
  description: string;
}

export interface TriggerConfig {
  type: TriggerType;
  condition?: string; // Expression like "count >= threshold" or "time.elapsed > duration"
  parameters: Record<string, any>;
}

export interface OutputConfig {
  event: string;
  condition?: string;
  data: Record<string, any>;
}

export interface ComponentStateMachine {
  fsl: string;
  states: ComponentState[];
  transitions: ComponentTransition[];
}

export interface ComponentState {
  id: string;
  name: string;
  type: "initial" | "intermediate" | "final" | "error";
  actions?: ComponentAction[];
}

export interface ComponentTransition {
  from: string;
  to: string;
  event: string;
  condition?: string;
}

export interface ComponentAction {
  type: string;
  config: Record<string, any>;
}

export type ComponentCategory =
  | "data-processing"
  | "aggregation"
  | "splitting"
  | "transformation"
  | "validation"
  | "external-integration"
  | "storage"
  | "notification"
  | "timing"
  | "carbon-credits";

export type PortType = "message" | "data" | "signal" | "measurement" | "token" | "certificate" | "event";

export type TriggerType =
  | "message-count"
  | "time-elapsed"
  | "time-scheduled"
  | "threshold-reached"
  | "external-event"
  | "batch-size"
  | "condition-met";

// Pre-built component library
export const COMPONENT_LIBRARY: Record<string, StateMachineComponent> = {
  // Data Processing Components
  QUEUE_ACCUMULATOR: {
    id: "queue-accumulator",
    name: "Queue Accumulator",
    description: "Accumulates incoming messages in a queue until a trigger condition is met",
    category: "data-processing",
    inputs: [
      {
        id: "input",
        name: "Input Messages",
        type: "message",
        dataSchema: { type: "object" },
        required: true,
        description: "Messages to be queued",
      },
    ],
    outputs: [
      {
        id: "batch",
        name: "Batch Output",
        type: "data",
        dataSchema: { type: "array" },
        required: true,
        description: "Batched messages when trigger condition is met",
      },
    ],
    config: {
      parameters: {
        maxSize: {
          type: "number",
          defaultValue: 10,
          validation: { min: 1, max: 1000 },
          description: "Maximum number of messages to queue before triggering",
        },
        timeout: {
          type: "duration",
          defaultValue: "1h",
          description: "Maximum time to wait before triggering (e.g., 1h, 30m, 15s)",
        },
        triggerOn: {
          type: "select",
          options: ["size", "time", "both"],
          defaultValue: "both",
          description: "What condition should trigger the batch output",
        },
      },
      triggers: [
        {
          type: "batch-size",
          condition: "queue.length >= maxSize",
          parameters: { threshold: "{{config.maxSize}}" },
        },
        {
          type: "time-elapsed",
          condition: "elapsed >= timeout",
          parameters: { duration: "{{config.timeout}}" },
        },
      ],
      outputs: [
        {
          event: "batch_ready",
          condition: "trigger_activated",
          data: { batch: "{{queue.messages}}", count: "{{queue.length}}" },
        },
      ],
    },
    stateMachine: {
      fsl: `
        idle 'message_received' -> accumulating;
        accumulating 'message_received' -> accumulating;
        accumulating 'batch_trigger' -> processing;
        processing 'batch_processed' -> idle;
      `,
      states: [
        { id: "idle", name: "Idle", type: "initial" },
        { id: "accumulating", name: "Accumulating Messages", type: "intermediate" },
        { id: "processing", name: "Processing Batch", type: "intermediate" },
      ],
      transitions: [
        { from: "idle", to: "accumulating", event: "message_received" },
        { from: "accumulating", to: "accumulating", event: "message_received" },
        { from: "accumulating", to: "processing", event: "batch_trigger" },
        { from: "processing", to: "idle", event: "batch_processed" },
      ],
    },
    version: "1.0.0",
    tags: ["queue", "batch", "accumulator", "trigger"],
  },

  AGGREGATOR: {
    id: "aggregator",
    name: "Data Aggregator",
    description: "Aggregates numerical data using various functions (sum, average, count, etc.)",
    category: "aggregation",
    inputs: [
      {
        id: "values",
        name: "Input Values",
        type: "data",
        dataSchema: { type: "array" },
        required: true,
        description: "Array of numerical values to aggregate",
      },
    ],
    outputs: [
      {
        id: "result",
        name: "Aggregated Result",
        type: "data",
        dataSchema: { type: "number" },
        required: true,
        description: "Single aggregated value",
      },
    ],
    config: {
      parameters: {
        function: {
          type: "select",
          options: ["sum", "average", "min", "max", "count", "median"],
          defaultValue: "sum",
          description: "Aggregation function to apply",
        },
        field: {
          type: "string",
          defaultValue: "value",
          description: "Field name to extract from objects (if input is array of objects)",
        },
        precision: {
          type: "number",
          defaultValue: 2,
          validation: { min: 0, max: 10 },
          description: "Decimal precision for the result",
        },
      },
      triggers: [
        {
          type: "external-event",
          condition: "input_received",
          parameters: {},
        },
      ],
      outputs: [
        {
          event: "aggregation_complete",
          condition: "calculation_finished",
          data: { result: "{{calculated_value}}", count: "{{input_count}}" },
        },
      ],
    },
    stateMachine: {
      fsl: `
        idle 'input_received' -> calculating;
        calculating 'calculation_complete' -> idle;
      `,
      states: [
        { id: "idle", name: "Waiting for Input", type: "initial" },
        { id: "calculating", name: "Calculating", type: "intermediate" },
      ],
      transitions: [
        { from: "idle", to: "calculating", event: "input_received" },
        { from: "calculating", to: "idle", event: "calculation_complete" },
      ],
    },
    version: "1.0.0",
    tags: ["aggregation", "math", "calculation", "statistics"],
  },

  SPLITTER: {
    id: "splitter",
    name: "Data Splitter",
    description: "Splits incoming data into multiple output streams based on conditions",
    category: "splitting",
    inputs: [
      {
        id: "input",
        name: "Input Data",
        type: "data",
        dataSchema: { type: "object" },
        required: true,
      },
    ],
    outputs: [
      {
        id: "output1",
        name: "Output Stream 1",
        type: "data",
        dataSchema: { type: "object" },
        required: false,
      },
      {
        id: "output2",
        name: "Output Stream 2",
        type: "data",
        dataSchema: { type: "object" },
        required: false,
      },
    ],
    config: {
      parameters: {
        splitCondition: {
          type: "string",
          defaultValue: "input.value > 100",
          description: "Condition to determine which output stream (true = output1, false = output2)",
        },
        mode: {
          type: "select",
          options: ["condition", "round-robin", "random"],
          defaultValue: "condition",
          description: "How to split the data",
        },
      },
      triggers: [
        {
          type: "external-event",
          condition: "input_received",
          parameters: {},
        },
      ],
      outputs: [
        {
          event: "split_complete",
          data: { routed_to: "{{selected_output}}" },
        },
      ],
    },
    stateMachine: {
      fsl: `
        idle 'input_received' -> evaluating;
        evaluating 'route_determined' -> idle;
      `,
      states: [
        { id: "idle", name: "Waiting", type: "initial" },
        { id: "evaluating", name: "Evaluating Split Condition", type: "intermediate" },
      ],
      transitions: [
        { from: "idle", to: "evaluating", event: "input_received" },
        { from: "evaluating", to: "idle", event: "route_determined" },
      ],
    },
    version: "1.0.0",
    tags: ["splitter", "routing", "condition", "distribution"],
  },

  // Carbon Credits specific components
  IOT_MEASUREMENT_VALIDATOR: {
    id: "iot-measurement-validator",
    name: "IoT Measurement Validator",
    description: "Validates IoT device measurements for carbon credit calculations",
    category: "carbon-credits",
    inputs: [
      {
        id: "measurement",
        name: "IoT Measurement",
        type: "measurement",
        dataSchema: {
          deviceId: "string",
          timestamp: "string",
          value: "number",
          unit: "string",
          signature: "string",
        },
        required: true,
      },
    ],
    outputs: [
      {
        id: "validated",
        name: "Validated Measurement",
        type: "measurement",
        dataSchema: {
          deviceId: "string",
          timestamp: "string",
          value: "number",
          unit: "string",
          signature: "string",
          verified: "boolean",
        },
        required: true,
      },
    ],
    config: {
      parameters: {
        deviceType: {
          type: "select",
          options: ["hydro-meter", "solar-meter", "wind-meter", "generic"],
          defaultValue: "hydro-meter",
          description: "Type of renewable energy device",
        },
        signatureRequired: {
          type: "boolean",
          defaultValue: true,
          description: "Whether cryptographic signature validation is required",
        },
        validationEndpoint: {
          type: "string",
          defaultValue: "https://api.renewable-registry.org/validate",
          description: "External validation service endpoint",
        },
      },
      triggers: [
        {
          type: "external-event",
          condition: "measurement_received",
          parameters: {},
        },
      ],
      outputs: [
        {
          event: "validation_complete",
          condition: "signature_verified && range_valid",
          data: { valid: "{{validation_result}}", measurement: "{{validated_measurement}}" },
        },
      ],
    },
    stateMachine: {
      fsl: `
        idle 'measurement_received' -> validating;
        validating 'signature_valid' -> range_checking;
        validating 'signature_invalid' -> rejected;
        range_checking 'range_valid' -> validated;
        range_checking 'range_invalid' -> rejected;
        validated 'output_sent' -> idle;
        rejected 'error_logged' -> idle;
      `,
      states: [
        { id: "idle", name: "Waiting for Measurement", type: "initial" },
        { id: "validating", name: "Validating Signature", type: "intermediate" },
        { id: "range_checking", name: "Checking Value Range", type: "intermediate" },
        { id: "validated", name: "Measurement Validated", type: "intermediate" },
        { id: "rejected", name: "Measurement Rejected", type: "error" },
      ],
      transitions: [
        { from: "idle", to: "validating", event: "measurement_received" },
        { from: "validating", to: "range_checking", event: "signature_valid" },
        { from: "validating", to: "rejected", event: "signature_invalid" },
        { from: "range_checking", to: "validated", event: "range_valid" },
        { from: "range_checking", to: "rejected", event: "range_invalid" },
        { from: "validated", to: "idle", event: "output_sent" },
        { from: "rejected", to: "idle", event: "error_logged" },
      ],
    },
    version: "1.0.0",
    tags: ["iot", "validation", "carbon-credits", "renewable-energy", "signature"],
  },

  CARBON_TOKEN_CREATOR: {
    id: "carbon-token-creator",
    name: "Carbon Token Creator",
    description: "Creates individual carbon credit tokens from validated measurements",
    category: "carbon-credits",
    inputs: [
      {
        id: "measurements",
        name: "Validated Measurements",
        type: "measurement",
        dataSchema: { type: "array" },
        required: true,
      },
    ],
    outputs: [
      {
        id: "tokens",
        name: "Carbon Tokens",
        type: "token",
        dataSchema: { type: "array" },
        required: true,
      },
    ],
    config: {
      parameters: {
        conversionRate: {
          type: "number",
          defaultValue: 1000,
          description: "kWh per carbon credit token (e.g., 1000 kWh = 1 token)",
        },
        tokenStandard: {
          type: "select",
          options: ["VCS", "GS", "CDM", "CAR", "REDD+"],
          defaultValue: "VCS",
          description: "Carbon credit standard to follow",
        },
        metadataFields: {
          type: "multiselect",
          options: ["projectId", "vintage", "geography", "technology", "additionality"],
          defaultValue: ["projectId", "vintage", "geography"],
          description: "Additional metadata to include in tokens",
        },
      },
      triggers: [
        {
          type: "external-event",
          condition: "measurements_received",
          parameters: {},
        },
      ],
      outputs: [
        {
          event: "tokens_created",
          data: {
            tokens: "{{created_tokens}}",
            totalCredits: "{{total_credits}}",
            metadata: "{{token_metadata}}",
          },
        },
      ],
    },
    stateMachine: {
      fsl: `
        idle 'measurements_received' -> calculating;
        calculating 'conversion_complete' -> creating_tokens;
        creating_tokens 'tokens_minted' -> idle;
      `,
      states: [
        { id: "idle", name: "Waiting for Measurements", type: "initial" },
        { id: "calculating", name: "Calculating Credits", type: "intermediate" },
        { id: "creating_tokens", name: "Creating Tokens", type: "intermediate" },
      ],
      transitions: [
        { from: "idle", to: "calculating", event: "measurements_received" },
        { from: "calculating", to: "creating_tokens", event: "conversion_complete" },
        { from: "creating_tokens", to: "idle", event: "tokens_minted" },
      ],
    },
    version: "1.0.0",
    tags: ["carbon-credits", "tokenization", "blockchain", "renewable-energy"],
  },

  CERTIFICATE_AGGREGATOR: {
    id: "certificate-aggregator",
    name: "Certificate Aggregator",
    description: "Aggregates carbon tokens into tradeable certificates",
    category: "carbon-credits",
    inputs: [
      {
        id: "tokens",
        name: "Carbon Tokens",
        type: "token",
        dataSchema: { type: "array" },
        required: true,
      },
    ],
    outputs: [
      {
        id: "certificate",
        name: "Carbon Certificate",
        type: "certificate",
        dataSchema: {
          id: "string",
          totalCredits: "number",
          tokens: "array",
          metadata: "object",
        },
        required: true,
      },
    ],
    config: {
      parameters: {
        certificateSize: {
          type: "number",
          defaultValue: 100,
          description: "Number of tokens per certificate",
        },
        aggregationPeriod: {
          type: "select",
          options: ["daily", "weekly", "monthly", "quarterly"],
          defaultValue: "monthly",
          description: "Time period for aggregating tokens",
        },
        qualityThreshold: {
          type: "number",
          defaultValue: 95,
          description: "Minimum quality score (%) for tokens to be included",
        },
      },
      triggers: [
        {
          type: "batch-size",
          condition: "tokens.length >= certificateSize",
          parameters: { threshold: "{{config.certificateSize}}" },
        },
        {
          type: "time-scheduled",
          condition: "period_end",
          parameters: { schedule: "{{config.aggregationPeriod}}" },
        },
      ],
      outputs: [
        {
          event: "certificate_created",
          data: { certificate: "{{generated_certificate}}" },
        },
      ],
    },
    stateMachine: {
      fsl: `
        idle 'tokens_received' -> accumulating;
        accumulating 'tokens_received' -> accumulating;
        accumulating 'threshold_reached' -> creating_certificate;
        creating_certificate 'certificate_generated' -> idle;
      `,
      states: [
        { id: "idle", name: "Waiting for Tokens", type: "initial" },
        { id: "accumulating", name: "Accumulating Tokens", type: "intermediate" },
        { id: "creating_certificate", name: "Creating Certificate", type: "intermediate" },
      ],
      transitions: [
        { from: "idle", to: "accumulating", event: "tokens_received" },
        { from: "accumulating", to: "accumulating", event: "tokens_received" },
        { from: "accumulating", to: "creating_certificate", event: "threshold_reached" },
        { from: "creating_certificate", to: "idle", event: "certificate_generated" },
      ],
    },
    version: "1.0.0",
    tags: ["carbon-credits", "certificates", "aggregation", "compliance"],
  },
};

/**
 * Utility functions for working with composable state machine components
 */
export class ComponentComposer {
  static compileComponents(components: StateMachineComponent[], connections: ComponentConnection[]): CompiledWorkflow {
    // This would compile individual components into a single, larger state machine
    // The details of this compilation process depend on the specific needs

    const compiledFSL = this.generateCompiledFSL(components, connections);
    const compiledVariables = this.mergeVariables(components);
    const compiledRules = this.generateCompiledRules(components, connections);
    const compiledActions = this.mergeActions(components);

    return {
      fsl: compiledFSL,
      variables: compiledVariables,
      messageRules: compiledRules,
      actions: compiledActions,
      metadata: {
        components: components.map(c => ({ id: c.id, name: c.name, version: c.version })),
        connections,
        compiledAt: new Date().toISOString(),
      },
    };
  }

  private static generateCompiledFSL(components: StateMachineComponent[], connections: ComponentConnection[]): string {
    // Generate a single FSL that represents the connected workflow
    // This is a simplified version - real implementation would be more complex
    return components.map(c => c.stateMachine.fsl).join("\n");
  }

  private static mergeVariables(components: StateMachineComponent[]): Record<string, any> {
    const merged: Record<string, any> = {};
    components.forEach(component => {
      Object.entries(component.config.parameters).forEach(([key, param]) => {
        merged[`${component.id}_${key}`] = {
          type: param.type,
          defaultValue: param.defaultValue,
          description: `${component.name}: ${param.description}`,
        };
      });
    });
    return merged;
  }

  private static generateCompiledRules(components: StateMachineComponent[], connections: ComponentConnection[]): any[] {
    // Generate message rules that handle inter-component communication
    const rules: any[] = [];

    connections.forEach(connection => {
      rules.push({
        id: `${connection.from.componentId}_to_${connection.to.componentId}`,
        matches: {
          type: `${connection.from.componentId}_output`,
          source: connection.from.portId,
        },
        generates: {
          type: `${connection.to.componentId}_input`,
          target: connection.to.portId,
          data: "{{event.data}}",
        },
      });
    });

    return rules;
  }

  private static mergeActions(components: StateMachineComponent[]): Record<string, any> {
    const actions: Record<string, any> = {};

    components.forEach(component => {
      component.stateMachine.states.forEach(state => {
        if (state.actions) {
          actions[`${component.id}_${state.id}`] = state.actions;
        }
      });
    });

    return actions;
  }
}

export interface ComponentConnection {
  from: {
    componentId: string;
    portId: string;
  };
  to: {
    componentId: string;
    portId: string;
  };
}

export interface CompiledWorkflow {
  fsl: string;
  variables: Record<string, any>;
  messageRules: any[];
  actions: Record<string, any>;
  metadata: {
    components: Array<{ id: string; name: string; version: string }>;
    connections: ComponentConnection[];
    compiledAt: string;
  };
}

export function getComponentsByCategory(category?: ComponentCategory): StateMachineComponent[] {
  const components = Object.values(COMPONENT_LIBRARY);
  return category ? components.filter(c => c.category === category) : components;
}

export function searchComponents(query: string): StateMachineComponent[] {
  const lowercaseQuery = query.toLowerCase();
  return Object.values(COMPONENT_LIBRARY).filter(
    component =>
      component.name.toLowerCase().includes(lowercaseQuery) ||
      component.description.toLowerCase().includes(lowercaseQuery) ||
      component.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)),
  );
}
