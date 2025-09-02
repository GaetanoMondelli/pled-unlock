/**
 * Script to generate Carbon Credit Tokenization template for PLED
 */
import { CARBON_CREDIT_TEMPLATES, CarbonCreditWorkflowBuilder } from "../templates/CarbonCreditTokenizationTemplate";

function generateCarbonCreditTemplate() {
  const hydroTemplate = CARBON_CREDIT_TEMPLATES.HYDRO_POWER_BASIC.generatePledTemplate();

  // Create the actual template for the system
  const carbonCreditTemplate = {
    templateId: "carbon-credit-hydro",
    name: "Carbon Credit Tokenization - Hydro Power",
    description:
      "Complete workflow for converting hydro power measurements into verified carbon credit certificates using IoT devices",
    category: "carbon",

    variables: {
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
      config: {
        conversionRate: { type: "number", required: true },
        batchSize: { type: "number", required: true },
        tokenStandard: { type: "string", required: true },
        certificateSize: { type: "number", required: true },
        qualityThreshold: { type: "number", required: true },
      },
    },

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

    messageRules: [
      {
        id: "iot_measurement_validation",
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
            title: "New hydro measurement from {{device.deviceType}}",
            content:
              "Received {{captures.measurementValue}} {{event.data.unit}} from device {{device.deviceId}} at {{device.location}}",
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
        id: "batch_accumulation_rule",
        priority: 2,
        matches: {
          type: "IOT_MEASUREMENT",
          conditions: {
            deviceId: "{{device.deviceId}}",
            signature: "(verified)",
          },
        },
        generates: {
          type: "batch_progress",
          template: {
            title: "Batch accumulation progress",
            content:
              "Collected measurement {{event.data.value}} for batch processing. Batch size: {{config.batchSize}}",
          },
        },
        transition: {
          to: "accumulating_measurements",
          conditions: {
            batchCount: "(less_than) {{config.batchSize}}",
          },
        },
      },
      {
        id: "batch_ready_rule",
        priority: 3,
        matches: {
          type: "IOT_MEASUREMENT",
          conditions: {
            batchCount: "{{config.batchSize}}",
          },
        },
        generates: {
          type: "batch_ready",
          template: {
            title: "Measurement batch ready for token creation",
            content: "Collected {{config.batchSize}} measurements, ready to create carbon tokens",
          },
        },
        transition: {
          to: "creating_tokens",
          conditions: {
            batchCount: "(equals) {{config.batchSize}}",
          },
        },
      },
      {
        id: "token_creation_rule",
        priority: 4,
        matches: {
          type: "TOKEN_CREATED",
          conditions: {
            qualityScore: "(greater_than) {{config.qualityThreshold}}",
          },
        },
        generates: {
          type: "quality_token",
          template: {
            title: "High-quality carbon token created",
            content:
              "Created token {{event.data.tokenId}} with {{event.data.credits}} credits (quality: {{event.data.qualityScore}}%)",
          },
        },
        transition: {
          to: "accumulating_tokens",
          conditions: {
            qualityScore: "(greater_than) {{config.qualityThreshold}}",
          },
        },
      },
      {
        id: "certificate_threshold_rule",
        priority: 5,
        matches: {
          type: "TOKEN_CREATED",
          conditions: {
            tokenCount: "{{config.certificateSize}}",
          },
        },
        generates: {
          type: "certificate_threshold_reached",
          template: {
            title: "Certificate threshold reached",
            content: "Accumulated {{config.certificateSize}} tokens, ready to generate certificate",
          },
        },
        transition: {
          to: "generating_certificate",
          conditions: {
            tokenCount: "(equals) {{config.certificateSize}}",
          },
        },
      },
      {
        id: "certificate_completion_rule",
        priority: 6,
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
            content:
              "Generated certificate with {{event.data.totalCredits}} carbon credits for project {{project.projectName}}",
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

    stateMachine: {
      fsl: `idle 'measurement_received' -> validating;
      validating 'signature_valid' -> processing_measurement;
      validating 'signature_invalid' -> workflow_error;
      processing_measurement 'batch_progress' -> accumulating_measurements;
      accumulating_measurements 'measurement_received' -> accumulating_measurements;
      accumulating_measurements 'batch_ready' -> creating_tokens;
      creating_tokens 'quality_token' -> accumulating_tokens;
      creating_tokens 'low_quality_token' -> quality_review;
      accumulating_tokens 'token_added' -> accumulating_tokens;
      accumulating_tokens 'certificate_threshold_reached' -> generating_certificate;
      generating_certificate 'certificate_ready' -> certificate_generated;
      quality_review 'approved' -> accumulating_tokens;
      quality_review 'rejected' -> idle;
      workflow_error 'retry' -> idle;`,
      initial: "idle",
      final: ["certificate_generated", "workflow_error"],
    },

    states: {
      validating: {
        description: "Validating IoT measurement signature and data integrity",
        actions: ["validate_signature", "verify_device"],
      },
      processing_measurement: {
        description: "Processing validated measurement for batch accumulation",
        actions: ["log_measurement", "check_batch_size"],
      },
      accumulating_measurements: {
        description: "Accumulating measurements until batch size is reached",
        actions: ["add_to_batch", "update_progress"],
      },
      creating_tokens: {
        description: "Converting measurement batch into carbon tokens",
        actions: ["mint_tokens", "calculate_quality"],
      },
      accumulating_tokens: {
        description: "Accumulating tokens until certificate threshold is reached",
        actions: ["add_to_token_pool", "check_certificate_threshold"],
      },
      generating_certificate: {
        description: "Generating carbon credit certificate from accumulated tokens",
        actions: ["create_certificate", "update_registry", "notify_stakeholders"],
      },
      certificate_generated: {
        description: "Carbon credit certificate has been successfully generated",
        actions: ["send_notification", "archive_data"],
      },
      quality_review: {
        description: "Manual review required for low-quality tokens",
        actions: ["request_review", "await_approval"],
      },
      workflow_error: {
        description: "Error in the workflow that requires attention",
        actions: ["log_error", "notify_admin"],
      },
    },

    actions: {
      validate_signature: {
        id: "validate_signature",
        name: "Validate IoT Signature",
        type: "IOT_VALIDATION",
        description: "Validate cryptographic signature from IoT device",
        template: {
          endpoint: "https://api.renewable-registry.org/validate",
          deviceId: "{{device.deviceId}}",
          signature: "{{event.data.signature}}",
          publicKey: "{{device.publicKey}}",
        },
      },
      mint_tokens: {
        id: "mint_tokens",
        name: "Mint Carbon Tokens",
        type: "TOKEN_MINT",
        description: "Create carbon tokens from verified measurements",
        template: {
          standard: "{{config.tokenStandard}}",
          conversionRate: "{{config.conversionRate}}",
          measurements: "{{batch.measurements}}",
          projectMetadata: "{{project}}",
        },
      },
      create_certificate: {
        id: "create_certificate",
        name: "Create Certificate",
        type: "CERTIFICATE_GENERATION",
        description: "Generate carbon credit certificate from token pool",
        template: {
          tokens: "{{tokenPool}}",
          projectId: "{{project.projectId}}",
          issuer: "Renewable Energy Registry",
          standard: "{{config.tokenStandard}}",
        },
      },
      update_registry: {
        id: "update_registry",
        name: "Update Carbon Registry",
        type: "EXTERNAL_API",
        description: "Update external carbon credit registry with new certificate",
        template: {
          endpoint: "https://api.carbon-registry.org/certificates",
          method: "POST",
          certificate: "{{certificate}}",
          apiKey: "{{registry.apiKey}}",
        },
      },
      notify_stakeholders: {
        id: "notify_stakeholders",
        name: "Notify Stakeholders",
        type: "NOTIFICATION",
        description: "Send notifications to project stakeholders about certificate generation",
        template: {
          recipients: ["{{project.owner}}", "{{registry.email}}"],
          subject: "New Carbon Credit Certificate Generated",
          template: "certificate_generated",
          certificateId: "{{certificate.id}}",
          totalCredits: "{{certificate.totalCredits}}",
        },
      },
    },

    documents: {
      certificates: [
        {
          id: "carbon_credit_certificate",
          name: "Carbon Credit Certificate",
          type: "certificate",
          content: "Verified Carbon Credit Certificate for {{project.projectName}}",
          linkedStates: ["generating_certificate", "certificate_generated"],
        },
      ],
    },

    metadata: {
      workflowType: "carbon-credit-tokenization",
      deviceTypes: ["hydro-meter", "solar-meter", "wind-meter"],
      tokenStandards: ["VCS", "GS", "CDM", "CAR", "REDD+"],
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      composableComponents: true,
      description: "Template for converting renewable energy measurements into verified carbon credit certificates",
    },
  };

  return carbonCreditTemplate;
}

// Export for use in other files
export { generateCarbonCreditTemplate };
