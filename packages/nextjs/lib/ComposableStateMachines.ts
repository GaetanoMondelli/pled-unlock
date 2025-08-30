/**
 * Composable State Machines - Refined Architecture
 * 
 * This implementation focuses on state-based message emission,
 * allowing individual states within components to emit messages
 * that can be consumed by other components.
 */

export type ComponentCategory = 
  | 'data-processing'
  | 'aggregation' 
  | 'splitting'
  | 'carbon-credits'
  | 'validation'
  | 'compliance'
  | 'transformation'
  | 'workflow';

export interface ComponentPort {
  id: string;
  name: string;
  dataType: string;
  direction: "input" | "output";
  type?: string; // Additional type information
  dataSchema?: any; // Schema for data validation
  required?: boolean;
}

export interface ComponentConfig {
  [key: string]: any;
}

export interface ComponentState {
  id: string;
  name: string;
  description?: string;
  onEnter?: ComponentAction[];
  onExit?: ComponentAction[];
}

export interface ComponentAction {
  type: string;
  parameters?: Record<string, any>;
}

export interface StateMessageEmission {
  messageType: string;
  data: Record<string, any>;
  condition?: string; // When to emit (e.g., "validation_success")
  targetComponent?: string; // Optional specific target
}

export interface StateMessageEmitter {
  stateId: string;
  onEnter?: StateMessageEmission[];
  onExit?: StateMessageEmission[]; 
  onAction?: Record<string, StateMessageEmission[]>; // Per action name
}

export interface MessageConsumer {
  inputPort: string;
  messageType: string;
  action: string; // What action to trigger when message received
  condition?: string;
}

export interface ComposableComponent {
  id: string;
  name: string;
  description: string;
  category: ComponentCategory;
  
  // Core state machine
  stateMachine: {
    fsl: string;
    states: ComponentState[];
    actions: Record<string, ComponentAction[]>; // Actions organized by state
  };
  
  // Message handling
  messageEmissions: StateMessageEmitter[];
  messageConsumption: MessageConsumer[];
  
  // External interface
  inputs: ComponentPort[];
  outputs: ComponentPort[];
  
  // Configuration
  config: ComponentConfig;
  version: string;
  tags: string[];
}

export interface ComponentState {
  id: string;
  name: string;
  type: 'initial' | 'intermediate' | 'final' | 'error';
  description?: string;
}

export interface ComponentAction {
  id: string;
  name: string;
  type: string;
  description: string;
  config: Record<string, any>;
}

export interface MessageRoute {
  from: {
    componentId: string;
    stateId: string;
    messageType: string;
  };
  to: {
    componentId: string;
    inputPort: string;
  };
  transform?: MessageTransform;
  condition?: string;
}

export interface MessageTransform {
  mapFields?: Record<string, string>;
  addFields?: Record<string, any>;
  filterCondition?: string;
}

export class MessageBus {
  private routes: MessageRoute[] = [];
  private components: Map<string, ComposableComponent> = new Map();
  
  addRoute(route: MessageRoute) {
    this.routes.push(route);
  }
  
  registerComponent(component: ComposableComponent) {
    this.components.set(component.id, component);
  }
  
  // Called when a component state emits a message
  handleStateEmission(componentId: string, stateId: string, messageType: string, data: any) {
    const matchingRoutes = this.routes.filter(r => 
      r.from.componentId === componentId && 
      r.from.stateId === stateId &&
      r.from.messageType === messageType
    );
    
    matchingRoutes.forEach(route => {
      let transformedData = data;
      if (route.transform) {
        transformedData = this.transformMessage(data, route.transform);
      }
      
      this.deliverMessage(route.to.componentId, route.to.inputPort, {
        type: messageType,
        data: transformedData,
        source: { componentId, stateId }
      });
    });
  }
  
  private transformMessage(data: any, transform: MessageTransform) {
    let result = { ...data };
    
    // Map fields
    if (transform.mapFields) {
      Object.entries(transform.mapFields).forEach(([from, to]) => {
        result[to] = result[from];
        delete result[from];
      });
    }
    
    // Add fields
    if (transform.addFields) {
      Object.assign(result, transform.addFields);
    }
    
    return result;
  }
  
  private deliverMessage(componentId: string, inputPort: string, message: any) {
    // This would trigger the target component's message handling
    console.log(`Delivering message to ${componentId}.${inputPort}:`, message);
  }
}

export class ComponentComposer {
  static compileComponents(
    components: ComposableComponent[], 
    routes: MessageRoute[]
  ): CompiledWorkflow {
    const namespacePrefix = this.generateNamespacePrefix(components);
    
    // 1. Create namespaced state IDs to avoid conflicts
    const namespacedStates = this.namespaceStates(components, namespacePrefix);
    
    // 2. Generate message rules from state emissions and routes
    const messageRules = this.generateMessageRules(components, routes, namespacePrefix);
    
    // 3. Merge actions from all components with namespacing
    const actions = this.mergeActions(components, namespacePrefix);
    
    // 4. Create composed FSL
    const fsl = this.generateComposedFSL(components, routes, namespacePrefix);
    
    // 5. Create PLED-compatible template
    return {
      fsl,
      states: namespacedStates,
      messageRules,
      actions,
      components: components.map(c => ({
        id: c.id,
        name: c.name,
        originalStates: c.stateMachine.states,
        namespacedStates: namespacedStates.filter(s => s.id.startsWith(`${c.id}_`))
      })),
      routes,
      metadata: {
        composedAt: new Date().toISOString(),
        componentCount: components.length,
        routeCount: routes.length
      }
    };
  }
  
  private static generateNamespacePrefix(components: ComposableComponent[]): Record<string, string> {
    const namespaces: Record<string, string> = {};
    components.forEach(c => {
      namespaces[c.id] = `${c.id}_`;
    });
    return namespaces;
  }
  
  private static namespaceStates(
    components: ComposableComponent[], 
    namespaces: Record<string, string>
  ): ComponentState[] {
    const allStates: ComponentState[] = [];
    
    components.forEach(component => {
      component.stateMachine.states.forEach(state => {
        allStates.push({
          ...state,
          id: `${namespaces[component.id]}${state.id}`,
          name: `${component.name}: ${state.name}`,
          description: `${state.description || ''} (from ${component.name})`
        });
      });
    });
    
    return allStates;
  }
  
  private static generateMessageRules(
    components: ComposableComponent[], 
    routes: MessageRoute[], 
    namespaces: Record<string, string>
  ): any[] {
    const messageRules: any[] = [];
    
    // Create rules for state emissions
    components.forEach(component => {
      component.messageEmissions.forEach(emission => {
        emission.onEnter?.forEach(msg => {
          messageRules.push({
            id: `${component.id}_${emission.stateId}_enter_${msg.messageType}`,
            priority: 1,
            matches: {
              type: 'STATE_ENTERED',
              conditions: {
                stateId: `${namespaces[component.id]}${emission.stateId}`
              }
            },
            generates: {
              type: msg.messageType,
              template: {
                title: `${component.name} emitted ${msg.messageType}`,
                content: `State ${emission.stateId} entered in ${component.name}`,
                ...msg.data
              }
            }
          });
        });
        
        emission.onExit?.forEach(msg => {
          messageRules.push({
            id: `${component.id}_${emission.stateId}_exit_${msg.messageType}`,
            priority: 1,
            matches: {
              type: 'STATE_EXITED',
              conditions: {
                stateId: `${namespaces[component.id]}${emission.stateId}`
              }
            },
            generates: {
              type: msg.messageType,
              template: {
                title: `${component.name} emitted ${msg.messageType}`,
                content: `State ${emission.stateId} exited in ${component.name}`,
                ...msg.data
              }
            }
          });
        });
      });
    });
    
    // Create rules for message routing between components
    routes.forEach(route => {
      const targetComponent = components.find(c => c.id === route.to.componentId);
      const targetConsumer = targetComponent?.messageConsumption.find(
        mc => mc.inputPort === route.to.inputPort && mc.messageType === route.from.messageType
      );
      
      if (targetConsumer) {
        messageRules.push({
          id: `route_${route.from.componentId}_${route.from.stateId}_to_${route.to.componentId}`,
          priority: 2,
          matches: {
            type: route.from.messageType,
            conditions: {
              source: `${route.from.componentId}.${route.from.stateId}`
            }
          },
          generates: {
            type: 'COMPONENT_MESSAGE',
            template: {
              targetComponent: route.to.componentId,
              inputPort: route.to.inputPort,
              action: targetConsumer.action
            }
          },
          transition: {
            to: `${namespaces[route.to.componentId]}processing`,
            conditions: {
              messageType: route.from.messageType
            }
          }
        });
      }
    });
    
    return messageRules;
  }
  
  private static mergeActions(
    components: ComposableComponent[], 
    namespaces: Record<string, string>
  ): Record<string, any[]> {
    const mergedActions: Record<string, any[]> = {};
    
    components.forEach(component => {
      Object.entries(component.stateMachine.actions).forEach(([stateId, actions]) => {
        const namespacedStateId = `${namespaces[component.id]}${stateId}`;
        mergedActions[namespacedStateId] = actions.map(action => ({
          ...action,
          id: `${component.id}_${action.id}`,
          name: `${component.name}: ${action.name}`
        }));
      });
    });
    
    return mergedActions;
  }
  
  private static generateComposedFSL(
    components: ComposableComponent[], 
    routes: MessageRoute[], 
    namespaces: Record<string, string>
  ): string {
    const fslLines: string[] = [];
    
    // Add FSL for each component with namespacing
    components.forEach(component => {
      const componentFsl = component.stateMachine.fsl;
      const namespacedFsl = componentFsl.replace(
        /(\w+)(\s+['"][^'"]*['"]?\s*->\s*)(\w+)/g,
        (match, fromState, arrow, toState) => {
          return `${namespaces[component.id]}${fromState}${arrow}${namespaces[component.id]}${toState}`;
        }
      );
      fslLines.push(namespacedFsl);
    });
    
    // Add transitions between components based on routes
    routes.forEach(route => {
      const sourceComponent = components.find(c => c.id === route.from.componentId);
      const targetComponent = components.find(c => c.id === route.to.componentId);
      
      if (sourceComponent && targetComponent) {
        // Add transition from source state to target component
        const sourceState = `${namespaces[route.from.componentId]}${route.from.stateId}`;
        const targetState = `${namespaces[route.to.componentId]}processing`; // Assume processing state
        
        fslLines.push(`${sourceState} '${route.from.messageType}' -> ${targetState};`);
      }
    });
    
    return fslLines.join('\n');
  }
}

export interface CompiledWorkflow {
  fsl: string;
  states: ComponentState[];
  messageRules: any[];
  actions: Record<string, any[]>;
  components: {
    id: string;
    name: string;
    originalStates: ComponentState[];
    namespacedStates: ComponentState[];
  }[];
  routes: MessageRoute[];
  metadata: {
    composedAt: string;
    componentCount: number;
    routeCount: number;
  };
}

// Carbon Credit specific composable components
export const CARBON_CREDIT_COMPONENTS: Record<string, ComposableComponent> = {
  IOT_VALIDATOR: {
    id: 'iot-validator',
    name: 'IoT Measurement Validator',
    description: 'Validates IoT measurements with cryptographic signatures',
    category: 'validation',
    
    stateMachine: {
      fsl: `idle 'measurement_received' -> validating;
            validating 'signature_valid' -> idle;
            validating 'signature_invalid' -> error;
            error 'retry' -> idle;`,
      states: [
        { id: 'idle', name: 'Idle', type: 'initial' },
        { id: 'validating', name: 'Validating', type: 'intermediate' },
        { id: 'error', name: 'Validation Error', type: 'error' }
      ],
      actions: {
        validating: [
          {
            id: 'validate_signature',
            name: 'Validate Signature',
            type: 'IOT_VALIDATION',
            description: 'Validate cryptographic signature of IoT measurement',
            config: {
              endpoint: '{{config.validationEndpoint}}',
              timeout: 5000
            }
          }
        ],
        error: [
          {
            id: 'log_error',
            name: 'Log Error',
            type: 'LOG_ERROR',
            description: 'Log validation error',
            config: {
              level: 'error'
            }
          }
        ]
      }
    },
    
    messageEmissions: [
      {
        stateId: 'idle',
        onExit: [{
          messageType: 'validated_measurement',
          data: { 
            measurement: '{{validated_data}}',
            deviceId: '{{input.deviceId}}',
            timestamp: '{{input.timestamp}}'
          },
          condition: 'validation_success'
        }]
      },
      {
        stateId: 'error',
        onEnter: [{
          messageType: 'validation_error',
          data: { 
            error: '{{error_details}}',
            deviceId: '{{input.deviceId}}'
          }
        }]
      }
    ],
    
    messageConsumption: [
      {
        inputPort: 'measurement',
        messageType: 'iot_measurement',
        action: 'validate_signature'
      }
    ],
    
    inputs: [{
      id: 'measurement',
      name: 'IoT Measurement',
      dataType: 'object',
      direction: 'input',
      type: 'measurement',
      dataSchema: { 
        deviceId: 'string',
        value: 'number', 
        timestamp: 'string',
        signature: 'string'
      },
      required: true
    }],
    
    outputs: [{
      id: 'validated',
      name: 'Validated Measurement',
      dataType: 'object',
      direction: 'output',
      type: 'measurement',
      dataSchema: { 
        measurement: 'object',
        validated: 'boolean' 
      },
      required: true
    }],
    
    config: {
      parameters: {
        validationEndpoint: {
          type: 'string',
          defaultValue: 'https://api.renewable-registry.org/validate',
          description: 'Endpoint for signature validation'
        },
        deviceType: {
          type: 'select',
          options: ['hydro-meter', 'solar-meter', 'wind-meter'],
          defaultValue: 'hydro-meter',
          description: 'Type of IoT device'
        }
      },
      triggers: [{
        type: 'external-event',
        condition: 'measurement_received',
        parameters: {}
      }],
      outputs: [{
        event: 'validated_measurement',
        data: { validated: true }
      }]
    },
    
    version: '1.0.0',
    tags: ['iot', 'validation', 'carbon-credits', 'signature']
  },

  MEASUREMENT_QUEUE: {
    id: 'measurement-queue',
    name: 'Measurement Queue',
    description: 'Accumulates IoT measurements for batch processing',
    category: 'data-processing',
    
    stateMachine: {
      fsl: `idle 'measurement_received' -> accumulating;
            accumulating 'measurement_received' -> accumulating;
            accumulating 'batch_threshold_reached' -> flushing;
            flushing 'batch_processed' -> idle;`,
      states: [
        { id: 'idle', name: 'Idle', type: 'initial' },
        { id: 'accumulating', name: 'Accumulating', type: 'intermediate' },
        { id: 'flushing', name: 'Flushing', type: 'intermediate' }
      ],
      actions: {
        accumulating: [
          {
            id: 'add_to_queue',
            name: 'Add to Queue',
            type: 'QUEUE_ADD',
            description: 'Add measurement to processing queue',
            config: {}
          }
        ],
        flushing: [
          {
            id: 'process_batch',
            name: 'Process Batch',
            type: 'BATCH_PROCESS',
            description: 'Process accumulated measurements as batch',
            config: {}
          }
        ]
      }
    },
    
    messageEmissions: [
      {
        stateId: 'flushing',
        onEnter: [{
          messageType: 'batch_ready',
          data: { 
            batch: '{{queue_contents}}',
            count: '{{queue_length}}',
            batchId: '{{generated_batch_id}}'
          }
        }]
      }
    ],
    
    messageConsumption: [
      {
        inputPort: 'input',
        messageType: 'validated_measurement',
        action: 'add_to_queue'
      }
    ],
    
    inputs: [{
      id: 'input',
      name: 'Measurements',
      dataType: 'object',
      direction: 'input',
      type: 'measurement',
      dataSchema: { type: 'object' },
      required: true
    }],
    
    outputs: [{
      id: 'batch',
      name: 'Measurement Batch',
      dataType: 'array',
      direction: 'output',
      type: 'data',
      dataSchema: { type: 'array' },
      required: true
    }],
    
    config: {
      parameters: {
        batchSize: {
          type: 'number',
          defaultValue: 24,
          validation: { min: 1, max: 1000 },
          description: 'Number of measurements per batch'
        },
        timeout: {
          type: 'duration',
          defaultValue: '1h',
          description: 'Maximum time before forcing batch'
        }
      },
      triggers: [{
        type: 'batch-size',
        condition: 'queue.length >= batchSize',
        parameters: {}
      }],
      outputs: [{
        event: 'batch_ready',
        data: { batch: '{{queue}}' }
      }]
    },
    
    version: '1.0.0',
    tags: ['queue', 'batch', 'measurements', 'carbon-credits']
  }
};