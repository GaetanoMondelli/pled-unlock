/**
 * Carbon Credit Tokenization Template
 *
 * This template demonstrates how to use composable state machine components
 * to create a complete carbon credit tokenization workflow from IoT measurements
 * to tradeable certificates.
 */
import {
  COMPONENT_LIBRARY,
  ComponentComposer,
  ComponentConnection,
  StateMachineComponent,
} from "@/lib/StateMachineComponents";

export interface CarbonCreditWorkflowConfig {
  deviceType: "hydro-meter" | "solar-meter" | "wind-meter" | "generic";
  conversionRate: number; // kWh per carbon credit
  batchSize: number; // measurements per batch
  tokenStandard: "VCS" | "GS" | "CDM" | "CAR" | "REDD+";
  certificateSize: number; // tokens per certificate
  aggregationPeriod: "daily" | "weekly" | "monthly" | "quarterly";
  qualityThreshold: number; // minimum quality score (%)
  signatureRequired: boolean;
  validationEndpoint: string;
  projectMetadata: {
    projectId: string;
    projectName: string;
    geography: string;
    technology: string;
    vintage: string;
    additionality: string;
  };
}

export class CarbonCreditWorkflowBuilder {
  private config: CarbonCreditWorkflowConfig;

  constructor(config: CarbonCreditWorkflowConfig) {
    this.config = config;
  }

  buildWorkflow() {
    const components = this.createComponentInstances();
    const connections = this.createConnections();

    return {
      components,
      connections,
      compiledWorkflow: ComponentComposer.compileComponents(components, connections),
      metadata: {
        workflowType: "carbon-credit-tokenization",
        config: this.config,
        createdAt: new Date().toISOString(),
        description: "Complete carbon credit tokenization workflow from IoT measurements to certificates",
      },
    };
  }

  private createComponentInstances(): StateMachineComponent[] {
    // Create customized instances of the components for this specific workflow
    return [
      this.createValidatorComponent(),
      this.createMeasurementAggregatorComponent(),
      this.createTokenCreatorComponent(),
      this.createTokenQueueComponent(),
      this.createCertificateAggregatorComponent(),
      this.createQualityControlComponent(),
      this.createAuditLoggerComponent(),
    ];
  }

  private createValidatorComponent(): StateMachineComponent {
    const baseComponent = COMPONENT_LIBRARY.IOT_MEASUREMENT_VALIDATOR;

    return {
      ...baseComponent,
      id: `${baseComponent.id}_instance_${Date.now()}`,
      config: {
        ...baseComponent.config,
        parameters: {
          ...baseComponent.config.parameters,
          deviceType: {
            ...baseComponent.config.parameters.deviceType,
            defaultValue: this.config.deviceType,
          },
          signatureRequired: {
            ...baseComponent.config.parameters.signatureRequired,
            defaultValue: this.config.signatureRequired,
          },
          validationEndpoint: {
            ...baseComponent.config.parameters.validationEndpoint,
            defaultValue: this.config.validationEndpoint,
          },
        },
      },
    };
  }

  private createMeasurementAggregatorComponent(): StateMachineComponent {
    const baseComponent = COMPONENT_LIBRARY.QUEUE_ACCUMULATOR;

    return {
      ...baseComponent,
      id: `measurement_aggregator_${Date.now()}`,
      name: "Measurement Aggregator",
      description: "Aggregates validated IoT measurements for batch processing",
      config: {
        ...baseComponent.config,
        parameters: {
          ...baseComponent.config.parameters,
          maxSize: {
            ...baseComponent.config.parameters.maxSize,
            defaultValue: this.config.batchSize,
          },
          timeout: {
            ...baseComponent.config.parameters.timeout,
            defaultValue: "1h", // Process measurements hourly
          },
        },
      },
    };
  }

  private createTokenCreatorComponent(): StateMachineComponent {
    const baseComponent = COMPONENT_LIBRARY.CARBON_TOKEN_CREATOR;

    return {
      ...baseComponent,
      id: `${baseComponent.id}_instance_${Date.now()}`,
      config: {
        ...baseComponent.config,
        parameters: {
          ...baseComponent.config.parameters,
          conversionRate: {
            ...baseComponent.config.parameters.conversionRate,
            defaultValue: this.config.conversionRate,
          },
          tokenStandard: {
            ...baseComponent.config.parameters.tokenStandard,
            defaultValue: this.config.tokenStandard,
          },
        },
      },
    };
  }

  private createTokenQueueComponent(): StateMachineComponent {
    const baseComponent = COMPONENT_LIBRARY.QUEUE_ACCUMULATOR;

    return {
      ...baseComponent,
      id: `token_queue_${Date.now()}`,
      name: "Token Queue",
      description: "Queues carbon tokens for certificate aggregation",
      config: {
        ...baseComponent.config,
        parameters: {
          ...baseComponent.config.parameters,
          maxSize: {
            ...baseComponent.config.parameters.maxSize,
            defaultValue: this.config.certificateSize,
          },
          timeout: {
            ...baseComponent.config.parameters.timeout,
            defaultValue: this.getPeriodDuration(this.config.aggregationPeriod),
          },
        },
      },
    };
  }

  private createCertificateAggregatorComponent(): StateMachineComponent {
    const baseComponent = COMPONENT_LIBRARY.CERTIFICATE_AGGREGATOR;

    return {
      ...baseComponent,
      id: `${baseComponent.id}_instance_${Date.now()}`,
      config: {
        ...baseComponent.config,
        parameters: {
          ...baseComponent.config.parameters,
          certificateSize: {
            ...baseComponent.config.parameters.certificateSize,
            defaultValue: this.config.certificateSize,
          },
          aggregationPeriod: {
            ...baseComponent.config.parameters.aggregationPeriod,
            defaultValue: this.config.aggregationPeriod,
          },
          qualityThreshold: {
            ...baseComponent.config.parameters.qualityThreshold,
            defaultValue: this.config.qualityThreshold,
          },
        },
      },
    };
  }

  private createQualityControlComponent(): StateMachineComponent {
    const baseComponent = COMPONENT_LIBRARY.SPLITTER;

    return {
      ...baseComponent,
      id: `quality_control_${Date.now()}`,
      name: "Quality Control Splitter",
      description: "Routes tokens based on quality score threshold",
      config: {
        ...baseComponent.config,
        parameters: {
          ...baseComponent.config.parameters,
          splitCondition: {
            ...baseComponent.config.parameters.splitCondition,
            defaultValue: `input.qualityScore >= ${this.config.qualityThreshold}`,
          },
        },
      },
    };
  }

  private createAuditLoggerComponent(): StateMachineComponent {
    return {
      id: `audit_logger_${Date.now()}`,
      name: "Audit Logger",
      description: "Logs all workflow events for compliance and auditing",
      category: "external-integration",
      inputs: [
        {
          id: "events",
          name: "Workflow Events",
          type: "event",
          dataSchema: { type: "object" },
          required: true,
        },
      ],
      outputs: [
        {
          id: "logged",
          name: "Logged Events",
          type: "event",
          dataSchema: { type: "object" },
          required: true,
        },
      ],
      config: {
        parameters: {
          logLevel: {
            type: "select",
            options: ["debug", "info", "warn", "error"],
            defaultValue: "info",
            description: "Minimum log level to record",
          },
          storageEndpoint: {
            type: "string",
            defaultValue: "https://api.carbon-registry.org/audit",
            description: "Audit log storage endpoint",
          },
          includeMetadata: {
            type: "boolean",
            defaultValue: true,
            description: "Include project metadata in audit logs",
          },
        },
        triggers: [
          {
            type: "external-event",
            condition: "event_received",
            parameters: {},
          },
        ],
        outputs: [
          {
            event: "audit_logged",
            data: {
              logId: "{{generated_log_id}}",
              timestamp: "{{log_timestamp}}",
              event: "{{original_event}}",
            },
          },
        ],
      },
      stateMachine: {
        fsl: `
          idle 'event_received' -> logging;
          logging 'log_stored' -> idle;
        `,
        states: [
          { id: "idle", name: "Waiting for Events", type: "initial" },
          { id: "logging", name: "Logging Event", type: "intermediate" },
        ],
        transitions: [
          { from: "idle", to: "logging", event: "event_received" },
          { from: "logging", to: "idle", event: "log_stored" },
        ],
      },
      version: "1.0.0",
      tags: ["audit", "compliance", "logging", "carbon-credits"],
    };
  }

  private createConnections(): ComponentConnection[] {
    // Define how the components are connected in the workflow
    return [
      // IoT measurements → Validator
      {
        from: { componentId: "iot_source", portId: "measurements" },
        to: { componentId: "iot_measurement_validator", portId: "measurement" },
      },

      // Validator → Measurement Aggregator
      {
        from: { componentId: "iot_measurement_validator", portId: "validated" },
        to: { componentId: "measurement_aggregator", portId: "input" },
      },

      // Measurement Aggregator → Token Creator
      {
        from: { componentId: "measurement_aggregator", portId: "batch" },
        to: { componentId: "carbon_token_creator", portId: "measurements" },
      },

      // Token Creator → Quality Control
      {
        from: { componentId: "carbon_token_creator", portId: "tokens" },
        to: { componentId: "quality_control", portId: "input" },
      },

      // Quality Control → Token Queue (high quality tokens)
      {
        from: { componentId: "quality_control", portId: "output1" },
        to: { componentId: "token_queue", portId: "input" },
      },

      // Token Queue → Certificate Aggregator
      {
        from: { componentId: "token_queue", portId: "batch" },
        to: { componentId: "certificate_aggregator", portId: "tokens" },
      },

      // All events → Audit Logger
      {
        from: { componentId: "iot_measurement_validator", portId: "validated" },
        to: { componentId: "audit_logger", portId: "events" },
      },
      {
        from: { componentId: "carbon_token_creator", portId: "tokens" },
        to: { componentId: "audit_logger", portId: "events" },
      },
      {
        from: { componentId: "certificate_aggregator", portId: "certificate" },
        to: { componentId: "audit_logger", portId: "events" },
      },
    ];
  }

  private getPeriodDuration(period: string): string {
    switch (period) {
      case "daily":
        return "24h";
      case "weekly":
        return "7d";
      case "monthly":
        return "30d";
      case "quarterly":
        return "90d";
      default:
        return "24h";
    }
  }

  // Generate a complete PLED template that can be used in the system
  generatePledTemplate() {
    const workflow = this.buildWorkflow();
    const compiledWorkflow = workflow.compiledWorkflow;

    return {
      templateId: `carbon-credit-tokenization-${Date.now()}`,
      name: "Carbon Credit Tokenization Workflow",
      description: `Complete workflow for converting ${this.config.deviceType} measurements into verified carbon credit certificates`,
      category: "carbon",

      // Variables from the composed workflow
      variables: {
        ...compiledWorkflow.variables,
        project: {
          projectId: { type: "string", required: true },
          projectName: { type: "string", required: true },
          geography: { type: "string", required: true },
          technology: { type: "string", required: true },
          vintage: { type: "string", required: true },
          additionality: { type: "string", required: true },
        },
        device: {
          deviceId: { type: "string", required: true },
          deviceType: { type: "string", required: true },
          location: { type: "string", required: true },
          certificateId: { type: "string", required: true },
        },
      },

      // Event types for IoT measurements and carbon tokens
      eventTypes: [
        {
          type: "IOT_MEASUREMENT",
          schema: {
            deviceId: "string",
            timestamp: "string",
            value: "number",
            unit: "string",
            signature: "string",
            metadata: "object",
          },
        },
        {
          type: "TOKEN_CREATED",
          schema: {
            tokenId: "string",
            credits: "number",
            metadata: "object",
            qualityScore: "number",
          },
        },
        {
          type: "CERTIFICATE_GENERATED",
          schema: {
            certificateId: "string",
            tokenIds: "array",
            totalCredits: "number",
            issueDate: "string",
            expiryDate: "string",
          },
        },
      ],

      // Message rules from the compiled workflow
      messageRules: [
        ...compiledWorkflow.messageRules,
        {
          id: "iot_measurement_rule",
          priority: 1,
          matches: {
            type: "IOT_MEASUREMENT",
            conditions: {
              deviceId: "{{device.deviceId}}",
              signature: "(verified)",
              value: "(positive)",
            },
          },
          captures: {
            measurementValue: "{{event.data.value}}",
            measurementTime: "{{event.data.timestamp}}",
            deviceLocation: "{{device.location}}",
          },
          generates: {
            type: "validated_measurement",
            template: {
              title: "New measurement from {{device.deviceType}}",
              content: "Received {{captures.measurementValue}} {{event.data.unit}} from device {{device.deviceId}}",
              timestamp: "{{captures.measurementTime}}",
            },
          },
          transition: {
            to: "processing_measurement",
            conditions: {
              measurementTime: "(after) {{previousState.time}}",
            },
          },
        },
        {
          id: "certificate_completion_rule",
          priority: 1,
          matches: {
            type: "CERTIFICATE_GENERATED",
            conditions: {
              totalCredits: "(greater_than) 0",
            },
          },
          generates: {
            type: "certificate_ready",
            template: {
              title: "Certificate {{event.data.certificateId}} ready",
              content: "Generated certificate with {{event.data.totalCredits}} carbon credits",
              timestamp: "{{event.data.issueDate}}",
            },
          },
          transition: {
            to: "certificate_generated",
            conditions: {
              issueDate: "(valid_date)",
            },
          },
        },
      ],

      // State machine from the compiled workflow
      stateMachine: {
        fsl: compiledWorkflow.fsl || this.getDefaultFSL(),
        initial: "idle",
        final: ["certificate_generated", "workflow_error"],
      },

      // Actions for automated operations
      actions: {
        ...compiledWorkflow.actions,
        processing_measurement: [
          {
            type: "VALIDATE_IOT_SIGNATURE",
            config: {
              publicKeyEndpoint: "{{config.validationEndpoint}}",
              deviceId: "{{device.deviceId}}",
            },
          },
        ],
        creating_tokens: [
          {
            type: "MINT_CARBON_TOKEN",
            config: {
              standard: this.config.tokenStandard,
              conversionRate: this.config.conversionRate,
              metadata: "{{project}}",
            },
          },
        ],
        certificate_generated: [
          {
            type: "NOTIFY_STAKEHOLDERS",
            config: {
              recipients: ["{{project.owner}}", "{{registry.email}}"],
              template: "certificate_generated",
              certificateId: "{{certificate.id}}",
            },
          },
          {
            type: "UPDATE_REGISTRY",
            config: {
              endpoint: "https://api.carbon-registry.org/certificates",
              certificate: "{{certificate}}",
            },
          },
        ],
      },

      // Metadata about the composable components used
      metadata: {
        composableComponents: workflow.components.map(c => ({
          id: c.id,
          name: c.name,
          version: c.version,
          category: c.category,
        })),
        connections: workflow.connections,
        workflowConfig: this.config,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private getDefaultFSL(): string {
    return `
      idle 'measurement_received' -> validating;
      validating 'signature_valid' -> processing_measurement;
      validating 'signature_invalid' -> workflow_error;
      processing_measurement 'batch_ready' -> creating_tokens;
      creating_tokens 'tokens_created' -> accumulating_tokens;
      accumulating_tokens 'tokens_received' -> accumulating_tokens;
      accumulating_tokens 'certificate_threshold_reached' -> generating_certificate;
      generating_certificate 'certificate_created' -> certificate_generated;
    `;
  }
}

// Pre-configured templates for common scenarios
export const CARBON_CREDIT_TEMPLATES = {
  HYDRO_POWER_BASIC: new CarbonCreditWorkflowBuilder({
    deviceType: "hydro-meter",
    conversionRate: 1000, // 1 MWh = 1 carbon credit
    batchSize: 24, // hourly measurements in a day
    tokenStandard: "VCS",
    certificateSize: 100,
    aggregationPeriod: "monthly",
    qualityThreshold: 95,
    signatureRequired: true,
    validationEndpoint: "https://api.renewable-registry.org/validate",
    projectMetadata: {
      projectId: "HYDRO-001",
      projectName: "Small Hydro Power Plant",
      geography: "Global South",
      technology: "Run-of-river hydroelectric",
      vintage: "2024",
      additionality: "Demonstrates environmental integrity",
    },
  }),

  SOLAR_DISTRIBUTED: new CarbonCreditWorkflowBuilder({
    deviceType: "solar-meter",
    conversionRate: 2000, // 2 MWh = 1 carbon credit (lower efficiency)
    batchSize: 48, // 30-minute intervals in a day
    tokenStandard: "GS",
    certificateSize: 50,
    aggregationPeriod: "weekly",
    qualityThreshold: 90,
    signatureRequired: true,
    validationEndpoint: "https://api.solar-registry.org/validate",
    projectMetadata: {
      projectId: "SOLAR-DIST-001",
      projectName: "Distributed Solar Network",
      geography: "Sub-Saharan Africa",
      technology: "Distributed solar PV",
      vintage: "2024",
      additionality: "Enables rural electrification",
    },
  }),
};
