/**
 * Enhanced FSM Examples
 *
 * This file contains example workflows and configurations that demonstrate
 * the capabilities of the Enhanced FSM system, including dual input streams,
 * event interpretation, feedback loops, and complex action systems.
 */

import {
  EnhancedFSMProcessNode,
  EnhancedFSMDefinition,
  EventInterpretationRule,
  EnhancedFSMAction,
  EnhancedFSMState,
  EnhancedFSMTransition,
  EventInput,
  MessageInput,
  FeedbackLoopConfig,
} from "./enhanced-fsm-schema";

/**
 * Example 1: Email Processing Workflow
 *
 * This FSM processes incoming emails and extracts information like signatures,
 * document attachments, and meeting requests using pattern matching and AI.
 */
export function createEmailProcessingFSM(): EnhancedFSMProcessNode {
  const states: EnhancedFSMState[] = [
    {
      id: "idle",
      name: "Idle",
      type: "initial",
      description: "Waiting for incoming emails",
    },
    {
      id: "analyzing",
      name: "Analyzing Email",
      type: "intermediate",
      description: "Processing email content with interpretation rules",
      timeout: 30000, // 30 second timeout
    },
    {
      id: "routing",
      name: "Routing Actions",
      type: "intermediate",
      description: "Determining appropriate actions based on email content",
    },
    {
      id: "completed",
      name: "Processing Complete",
      type: "final",
      description: "Email has been processed and actions triggered",
    },
    {
      id: "error",
      name: "Error State",
      type: "error",
      description: "An error occurred during processing",
    },
  ];

  const transitions: EnhancedFSMTransition[] = [
    {
      id: "start_analysis",
      from: "idle",
      to: "analyzing",
      trigger: {
        type: "event",
        eventType: "email",
      },
      priority: 100,
    },
    {
      id: "analysis_complete",
      from: "analyzing",
      to: "routing",
      trigger: {
        type: "message",
        messageType: "email_analyzed",
      },
      priority: 100,
    },
    {
      id: "routing_complete",
      from: "routing",
      to: "completed",
      trigger: {
        type: "message",
        messageType: "actions_triggered",
      },
      priority: 100,
    },
    {
      id: "analysis_timeout",
      from: "analyzing",
      to: "error",
      trigger: {
        type: "timer",
        timeout: 30000,
      },
      priority: 90,
    },
    {
      id: "reset_from_complete",
      from: "completed",
      to: "idle",
      trigger: {
        type: "timer",
        timeout: 5000,
      },
      priority: 100,
    },
    {
      id: "reset_from_error",
      from: "error",
      to: "idle",
      trigger: {
        type: "timer",
        timeout: 10000,
      },
      priority: 100,
    },
  ];

  const interpretationRules: EventInterpretationRule[] = [
    {
      id: "signature_detection",
      name: "Signature Request Detection",
      description: "Detects signature requests in emails",
      enabled: true,
      priority: 100,
      conditions: {
        eventTypes: ["email"],
        eventPattern: "signature|sign|docusign|adobe sign",
      },
      method: {
        type: "pattern",
        patterns: [
          {
            pattern: /please\s+sign\s+(.+)/i,
            messageType: "signature_requested",
            extractFields: {
              document: "$1",
            },
          },
          {
            pattern: /document\s+requires?\s+your\s+signature/i,
            messageType: "signature_requested",
            extractFields: {},
          },
        ],
      },
    },
    {
      id: "meeting_detection",
      name: "Meeting Request Detection",
      description: "Detects meeting invitations in emails",
      enabled: true,
      priority: 90,
      conditions: {
        eventTypes: ["email"],
        eventPattern: "meeting|calendar|invite|appointment",
      },
      method: {
        type: "pattern",
        patterns: [
          {
            pattern: /meeting\s+on\s+(.+?)\s+at\s+(.+)/i,
            messageType: "meeting_requested",
            extractFields: {
              date: "$1",
              time: "$2",
            },
          },
        ],
      },
    },
    {
      id: "ai_content_analysis",
      name: "AI Content Analysis",
      description: "Uses AI to analyze email content and intent",
      enabled: true,
      priority: 80,
      conditions: {
        eventTypes: ["email"],
      },
      method: {
        type: "ai",
        model: "gpt-4",
        prompt: `
          Analyze this email and determine the primary intent:
          Email: {{event.data}}

          Possible intents:
          - contract_negotiation: Contract or agreement discussion
          - payment_request: Request for payment or invoice
          - project_update: Status update on work or project
          - support_request: Customer support or help request
          - general_inquiry: General question or information request
        `,
        messageTypes: ["contract_negotiation", "payment_request", "project_update", "support_request", "general_inquiry"],
        confidenceThreshold: 0.7,
      },
    },
  ];

  const actions: EnhancedFSMAction[] = [
    {
      id: "log_email_received",
      name: "Log Email Received",
      description: "Log that an email was received",
      enabled: true,
      trigger: "onEntry",
      outputs: [
        {
          id: "email_log",
          type: {
            outputType: "log",
            level: "info",
            message: "Email received: {{input.subject}} from {{input.from}}",
          },
        },
      ],
      onError: "continue",
      retryCount: 0,
      timeout: 1000,
    },
    {
      id: "trigger_signature_workflow",
      name: "Trigger Signature Workflow",
      description: "Start signature collection process",
      enabled: true,
      trigger: "onEntry",
      outputs: [
        {
          id: "signature_api_call",
          type: {
            outputType: "api_call",
            method: "POST",
            url: "/api/docusign/envelope",
            body: {
              recipients: ["{{input.from}}"],
              document: "{{input.document}}",
              template: "signature_request",
            },
            responseMapping: {
              envelopeId: "envelope.id",
              status: "envelope.status",
            },
          },
        },
        {
          id: "signature_feedback",
          type: {
            outputType: "event",
            eventType: "signature_initiated",
            data: {
              envelopeId: "{{variables.envelopeId}}",
              recipient: "{{input.from}}",
              timestamp: "{{timestamp}}",
            },
            targetStream: "self",
          },
          condition: "variables.envelopeId != null",
        },
      ],
      onError: "continue",
      retryCount: 2,
      timeout: 10000,
    },
    {
      id: "schedule_meeting",
      name: "Schedule Meeting",
      description: "Add meeting to calendar",
      enabled: true,
      trigger: "onEntry",
      outputs: [
        {
          id: "calendar_api_call",
          type: {
            outputType: "api_call",
            method: "POST",
            url: "/api/calendar/events",
            body: {
              title: "Meeting with {{input.from}}",
              date: "{{input.date}}",
              time: "{{input.time}}",
              attendees: ["{{input.from}}"],
            },
            responseMapping: {
              eventId: "event.id",
            },
          },
        },
        {
          id: "meeting_confirmation",
          type: {
            outputType: "email",
            to: "{{input.from}}",
            subject: "Meeting Scheduled: {{input.date}} at {{input.time}}",
            body: "Your meeting has been scheduled. Event ID: {{variables.eventId}}",
          },
          condition: "variables.eventId != null",
        },
      ],
      onError: "continue",
      retryCount: 1,
      timeout: 15000,
    },
  ];

  // Add actions to appropriate states
  states[1].actions = [actions[0]]; // Log action in analyzing state
  states[2].actions = [actions[1], actions[2]]; // Signature and meeting actions in routing state

  const eventInputs: EventInput[] = [
    {
      name: "email_events",
      description: "Incoming email events",
      eventTypes: ["email", "gmail", "outlook"],
      required: true,
      bufferSize: 500,
    },
  ];

  const messageInputs: MessageInput[] = [
    {
      name: "email_messages",
      description: "Processed email messages",
      messageTypes: ["email_analyzed", "signature_requested", "meeting_requested"],
      required: false,
      interface: {
        type: "object",
        requiredFields: ["type", "payload"],
      },
      bufferSize: 100,
    },
  ];

  const feedbackConfig: FeedbackLoopConfig = {
    enabled: true,
    maxDepth: 5,
    circuitBreaker: {
      enabled: true,
      threshold: 50,
      timeWindow: 60000,
      cooldownPeriod: 30000,
    },
    routing: {
      allowSelfFeedback: true,
      allowExternalFeedback: true,
      blacklistedNodes: [],
    },
  };

  const fsmDefinition: EnhancedFSMDefinition = {
    states,
    transitions,
    initialState: "idle",
    variables: {
      processedCount: 0,
      lastProcessedTime: 0,
    },
    interpretationRules,
    feedbackConfig,
  };

  return {
    nodeId: "email_processor_fsm",
    displayName: "Email Processing FSM",
    type: "EnhancedFSMProcessNode",
    position: { x: 0, y: 0 },
    eventInputs,
    messageInputs,
    tokenInputs: [],
    fsm: fsmDefinition,
    config: {
      debugMode: true,
      logLevel: "info",
      enableMetrics: true,
      maxEventHistory: 1000,
      maxMessageHistory: 1000,
    },
    version: "1.0",
    description: "Processes incoming emails and triggers appropriate workflows based on content analysis",
    tags: ["email", "ai", "workflow", "docusign"],
  };
}

/**
 * Example 2: IoT Data Processing Pipeline
 *
 * This FSM processes IoT sensor data, validates measurements, aggregates values,
 * and triggers alerts when thresholds are exceeded.
 */
export function createIoTDataProcessingFSM(): EnhancedFSMProcessNode {
  const states: EnhancedFSMState[] = [
    {
      id: "monitoring",
      name: "Monitoring",
      type: "initial",
      description: "Continuously monitoring sensor data",
    },
    {
      id: "validating",
      name: "Validating Data",
      type: "intermediate",
      description: "Validating sensor readings",
      timeout: 5000,
    },
    {
      id: "aggregating",
      name: "Aggregating",
      type: "intermediate",
      description: "Aggregating valid measurements",
    },
    {
      id: "alerting",
      name: "Alerting",
      type: "intermediate",
      description: "Triggering alerts for threshold violations",
    },
    {
      id: "storing",
      name: "Storing Data",
      type: "intermediate",
      description: "Persisting processed data",
    },
  ];

  const transitions: EnhancedFSMTransition[] = [
    {
      id: "sensor_reading",
      from: "monitoring",
      to: "validating",
      trigger: {
        type: "event",
        eventType: "sensor_reading",
      },
      priority: 100,
    },
    {
      id: "validation_success",
      from: "validating",
      to: "aggregating",
      trigger: {
        type: "message",
        messageType: "measurement_valid",
      },
      priority: 100,
    },
    {
      id: "validation_failed",
      from: "validating",
      to: "monitoring",
      trigger: {
        type: "message",
        messageType: "measurement_invalid",
      },
      priority: 100,
    },
    {
      id: "aggregation_complete",
      from: "aggregating",
      to: "storing",
      trigger: {
        type: "message",
        messageType: "batch_ready",
      },
      priority: 100,
    },
    {
      id: "threshold_exceeded",
      from: "aggregating",
      to: "alerting",
      trigger: {
        type: "message",
        messageType: "threshold_exceeded",
      },
      priority: 110, // Higher priority than normal flow
    },
    {
      id: "alert_sent",
      from: "alerting",
      to: "storing",
      trigger: {
        type: "message",
        messageType: "alert_sent",
      },
      priority: 100,
    },
    {
      id: "data_stored",
      from: "storing",
      to: "monitoring",
      trigger: {
        type: "message",
        messageType: "data_persisted",
      },
      priority: 100,
    },
  ];

  const interpretationRules: EventInterpretationRule[] = [
    {
      id: "sensor_data_validation",
      name: "Sensor Data Validation",
      description: "Validates incoming sensor readings",
      enabled: true,
      priority: 100,
      conditions: {
        eventTypes: ["sensor_reading"],
      },
      method: {
        type: "formula",
        formula: `
          const reading = event.value;
          const deviceId = event.deviceId;
          const timestamp = event.timestamp;

          // Basic validation
          if (reading == null || isNaN(reading)) {
            return { valid: false, reason: "Invalid reading value" };
          }

          if (reading < -100 || reading > 1000) {
            return { valid: false, reason: "Reading out of range" };
          }

          if (!deviceId) {
            return { valid: false, reason: "Missing device ID" };
          }

          // Check for reasonable timestamp
          const now = Date.now();
          if (Math.abs(now - timestamp) > 300000) { // 5 minutes
            return { valid: false, reason: "Timestamp too old or future" };
          }

          return {
            valid: true,
            value: reading,
            deviceId: deviceId,
            timestamp: timestamp,
            normalizedValue: Math.round(reading * 100) / 100
          };
        `,
        messageType: "validation_result",
      },
    },
    {
      id: "threshold_checker",
      name: "Threshold Checker",
      description: "Checks if values exceed alert thresholds",
      enabled: true,
      priority: 90,
      conditions: {
        eventTypes: ["sensor_reading"],
      },
      method: {
        type: "formula",
        formula: `
          const reading = event.value;
          const deviceType = event.deviceType || "unknown";

          // Define thresholds by device type
          const thresholds = {
            temperature: { min: -50, max: 80, critical: 100 },
            humidity: { min: 0, max: 100, critical: 95 },
            pressure: { min: 800, max: 1200, critical: 1300 },
            unknown: { min: 0, max: 100, critical: 90 }
          };

          const threshold = thresholds[deviceType] || thresholds.unknown;

          if (reading > threshold.critical) {
            return {
              alert: "critical",
              value: reading,
              threshold: threshold.critical,
              message: "Critical threshold exceeded"
            };
          } else if (reading > threshold.max || reading < threshold.min) {
            return {
              alert: "warning",
              value: reading,
              threshold: reading > threshold.max ? threshold.max : threshold.min,
              message: "Warning threshold exceeded"
            };
          }

          return null; // No alert needed
        `,
        messageType: "threshold_check",
      },
    },
  ];

  const actions: EnhancedFSMAction[] = [
    {
      id: "process_validation",
      name: "Process Validation Result",
      description: "Handle validation results and route appropriately",
      enabled: true,
      trigger: "onEntry",
      outputs: [
        {
          id: "valid_measurement",
          type: {
            outputType: "message",
            messageType: "measurement_valid",
            payload: {
              value: "{{input.normalizedValue}}",
              deviceId: "{{input.deviceId}}",
              timestamp: "{{input.timestamp}}",
            },
          },
          condition: "input.valid === true",
        },
        {
          id: "invalid_measurement",
          type: {
            outputType: "message",
            messageType: "measurement_invalid",
            payload: {
              reason: "{{input.reason}}",
              originalValue: "{{input.value}}",
              deviceId: "{{input.deviceId}}",
            },
          },
          condition: "input.valid === false",
        },
        {
          id: "validation_log",
          type: {
            outputType: "log",
            level: "debug",
            message: "Validated reading from {{input.deviceId}}: {{input.valid ? 'valid' : 'invalid'}}",
          },
        },
      ],
      onError: "continue",
      retryCount: 0,
      timeout: 2000,
    },
    {
      id: "aggregate_measurements",
      name: "Aggregate Measurements",
      description: "Collect and aggregate valid measurements",
      enabled: true,
      trigger: "onEntry",
      outputs: [
        {
          id: "update_buffer",
          type: {
            outputType: "variable",
            variableName: "state.measurementBuffer",
            value: "{{state.measurementBuffer || []}}",
            operation: "append",
          },
        },
        {
          id: "increment_count",
          type: {
            outputType: "variable",
            variableName: "variables.totalMeasurements",
            value: 1,
            operation: "increment",
          },
        },
        {
          id: "check_batch_ready",
          type: {
            outputType: "message",
            messageType: "batch_ready",
            payload: {
              measurements: "{{state.measurementBuffer}}",
              count: "{{state.measurementBuffer.length}}",
              batchId: "{{uuid()}}",
            },
          },
          condition: "(state.measurementBuffer || []).length >= 10", // Batch every 10 measurements
        },
      ],
      onError: "continue",
      retryCount: 0,
      timeout: 5000,
    },
    {
      id: "send_alert",
      name: "Send Alert",
      description: "Send alert for threshold violations",
      enabled: true,
      trigger: "onEntry",
      outputs: [
        {
          id: "alert_api_call",
          type: {
            outputType: "api_call",
            method: "POST",
            url: "/api/alerts",
            body: {
              level: "{{input.alert}}",
              message: "{{input.message}}",
              value: "{{input.value}}",
              threshold: "{{input.threshold}}",
              deviceId: "{{input.deviceId}}",
              timestamp: "{{now()}}",
            },
          },
        },
        {
          id: "alert_email",
          type: {
            outputType: "email",
            to: "admin@company.com",
            subject: "{{input.alert.toUpperCase()}} Alert: Threshold Exceeded",
            body: "Device {{input.deviceId}} reported {{input.value}} which exceeds threshold of {{input.threshold}}",
          },
          condition: "input.alert === 'critical'",
        },
        {
          id: "alert_complete",
          type: {
            outputType: "message",
            messageType: "alert_sent",
            payload: {
              alertLevel: "{{input.alert}}",
              timestamp: "{{now()}}",
            },
          },
        },
      ],
      onError: "continue",
      retryCount: 2,
      timeout: 10000,
    },
    {
      id: "persist_data",
      name: "Persist Data",
      description: "Store processed data in database",
      enabled: true,
      trigger: "onEntry",
      outputs: [
        {
          id: "database_call",
          type: {
            outputType: "api_call",
            method: "POST",
            url: "/api/measurements",
            body: {
              batchId: "{{input.batchId}}",
              measurements: "{{input.measurements}}",
              processedAt: "{{now()}}",
            },
            responseMapping: {
              recordId: "record.id",
              status: "status",
            },
          },
        },
        {
          id: "clear_buffer",
          type: {
            outputType: "variable",
            variableName: "state.measurementBuffer",
            value: [],
            operation: "set",
          },
          condition: "variables.status === 'success'",
        },
        {
          id: "storage_complete",
          type: {
            outputType: "message",
            messageType: "data_persisted",
            payload: {
              recordId: "{{variables.recordId}}",
              count: "{{input.measurements.length}}",
            },
          },
          condition: "variables.status === 'success'",
        },
      ],
      onError: "retry",
      retryCount: 3,
      timeout: 15000,
    },
  ];

  // Add actions to states
  states[1].actions = [actions[0]]; // Validation processing
  states[2].actions = [actions[1]]; // Aggregation
  states[3].actions = [actions[2]]; // Alerting
  states[4].actions = [actions[3]]; // Data persistence

  const eventInputs: EventInput[] = [
    {
      name: "sensor_events",
      description: "Raw sensor data events",
      eventTypes: ["sensor_reading", "device_status", "calibration"],
      required: true,
      bufferSize: 2000,
    },
  ];

  const messageInputs: MessageInput[] = [
    {
      name: "control_messages",
      description: "Control and status messages",
      messageTypes: ["validation_result", "batch_ready", "alert_sent", "data_persisted"],
      required: false,
      interface: {
        type: "object",
        requiredFields: ["type", "payload"],
      },
      bufferSize: 500,
    },
  ];

  const feedbackConfig: FeedbackLoopConfig = {
    enabled: true,
    maxDepth: 3,
    circuitBreaker: {
      enabled: true,
      threshold: 100,
      timeWindow: 60000,
      cooldownPeriod: 30000,
    },
    routing: {
      allowSelfFeedback: true,
      allowExternalFeedback: false, // Keep IoT processing isolated
      blacklistedNodes: [],
    },
  };

  const fsmDefinition: EnhancedFSMDefinition = {
    states,
    transitions,
    initialState: "monitoring",
    variables: {
      totalMeasurements: 0,
      alertsSent: 0,
      lastBatchTime: 0,
    },
    interpretationRules,
    feedbackConfig,
  };

  return {
    nodeId: "iot_processor_fsm",
    displayName: "IoT Data Processing FSM",
    type: "EnhancedFSMProcessNode",
    position: { x: 0, y: 0 },
    eventInputs,
    messageInputs,
    tokenInputs: [],
    fsm: fsmDefinition,
    config: {
      debugMode: false,
      logLevel: "warn",
      enableMetrics: true,
      maxEventHistory: 5000,
      maxMessageHistory: 2000,
    },
    version: "1.0",
    description: "Processes IoT sensor data with validation, aggregation, and alerting",
    tags: ["iot", "sensors", "monitoring", "alerts"],
  };
}

/**
 * Example 3: Document Approval Workflow
 *
 * This FSM manages document approval processes with multiple stakeholders,
 * deadline tracking, and escalation procedures.
 */
export function createDocumentApprovalFSM(): EnhancedFSMProcessNode {
  const states: EnhancedFSMState[] = [
    {
      id: "draft",
      name: "Draft",
      type: "initial",
      description: "Document is in draft state",
    },
    {
      id: "review_pending",
      name: "Review Pending",
      type: "intermediate",
      description: "Waiting for reviewer assignment",
    },
    {
      id: "under_review",
      name: "Under Review",
      type: "intermediate",
      description: "Document is being reviewed",
      timeout: 172800000, // 48 hours
    },
    {
      id: "changes_requested",
      name: "Changes Requested",
      type: "intermediate",
      description: "Reviewer requested changes",
    },
    {
      id: "escalated",
      name: "Escalated",
      type: "intermediate",
      description: "Review escalated to manager",
    },
    {
      id: "approved",
      name: "Approved",
      type: "final",
      description: "Document has been approved",
    },
    {
      id: "rejected",
      name: "Rejected",
      type: "final",
      description: "Document has been rejected",
    },
  ];

  const transitions: EnhancedFSMTransition[] = [
    {
      id: "submit_for_review",
      from: "draft",
      to: "review_pending",
      trigger: {
        type: "message",
        messageType: "submit_document",
      },
      priority: 100,
    },
    {
      id: "reviewer_assigned",
      from: "review_pending",
      to: "under_review",
      trigger: {
        type: "message",
        messageType: "reviewer_assigned",
      },
      priority: 100,
    },
    {
      id: "document_approved",
      from: "under_review",
      to: "approved",
      trigger: {
        type: "message",
        messageType: "approval_received",
      },
      priority: 100,
    },
    {
      id: "document_rejected",
      from: "under_review",
      to: "rejected",
      trigger: {
        type: "message",
        messageType: "rejection_received",
      },
      priority: 100,
    },
    {
      id: "changes_requested_transition",
      from: "under_review",
      to: "changes_requested",
      trigger: {
        type: "message",
        messageType: "changes_requested",
      },
      priority: 100,
    },
    {
      id: "review_timeout",
      from: "under_review",
      to: "escalated",
      trigger: {
        type: "timer",
        timeout: 172800000, // 48 hours
      },
      priority: 90,
    },
    {
      id: "changes_made",
      from: "changes_requested",
      to: "under_review",
      trigger: {
        type: "message",
        messageType: "document_updated",
      },
      priority: 100,
    },
    {
      id: "escalation_approved",
      from: "escalated",
      to: "approved",
      trigger: {
        type: "message",
        messageType: "manager_approval",
      },
      priority: 100,
    },
    {
      id: "escalation_rejected",
      from: "escalated",
      to: "rejected",
      trigger: {
        type: "message",
        messageType: "manager_rejection",
      },
      priority: 100,
    },
  ];

  // This example demonstrates a complex workflow FSM
  // The full implementation would include detailed interpretation rules and actions
  // For brevity, showing the structure with key components

  const fsmDefinition: EnhancedFSMDefinition = {
    states,
    transitions,
    initialState: "draft",
    variables: {
      documentId: "",
      submitter: "",
      reviewer: "",
      deadline: 0,
      escalationCount: 0,
    },
    interpretationRules: [], // Would include email parsing, document analysis, etc.
    feedbackConfig: {
      enabled: true,
      maxDepth: 8,
      circuitBreaker: {
        enabled: true,
        threshold: 25,
        timeWindow: 300000, // 5 minutes
        cooldownPeriod: 60000, // 1 minute
      },
      routing: {
        allowSelfFeedback: true,
        allowExternalFeedback: true,
        blacklistedNodes: [],
      },
    },
  };

  return {
    nodeId: "document_approval_fsm",
    displayName: "Document Approval FSM",
    type: "EnhancedFSMProcessNode",
    position: { x: 0, y: 0 },
    eventInputs: [
      {
        name: "document_events",
        description: "Document lifecycle events",
        eventTypes: ["document_submitted", "review_response", "deadline_reminder"],
        required: true,
        bufferSize: 1000,
      },
    ],
    messageInputs: [
      {
        name: "workflow_messages",
        description: "Workflow control messages",
        messageTypes: ["submit_document", "reviewer_assigned", "approval_received", "rejection_received"],
        required: false,
        interface: {
          type: "object",
          requiredFields: ["type", "payload"],
        },
        bufferSize: 200,
      },
    ],
    tokenInputs: [],
    fsm: fsmDefinition,
    config: {
      debugMode: true,
      logLevel: "info",
      enableMetrics: true,
      maxEventHistory: 2000,
      maxMessageHistory: 1000,
    },
    version: "1.0",
    description: "Manages document approval workflows with escalation and deadline tracking",
    tags: ["documents", "approval", "workflow", "deadlines"],
  };
}

/**
 * Factory function to create example scenarios
 */
export function createExampleScenarios() {
  return {
    emailProcessing: createEmailProcessingFSM(),
    iotDataProcessing: createIoTDataProcessingFSM(),
    documentApproval: createDocumentApprovalFSM(),
  };
}