import { matchEventToRule } from "./eventMatching";

interface MessageRule {
  matches: any;
  id: string;
  priority: number;
  when: {
    type: string;
    conditions?: Record<string, any>;
  };
  generates: {
    type: string;
    template: Record<string, string>;
  };
  captures?: Record<string, string>;
}

export function generateMessages(events: any[], rules: MessageRule[], variables: any) {
  const messages: any[] = [];
  const outputs: Record<string, any> = {};
  
  if (!Array.isArray(events) || !Array.isArray(rules)) {
    console.error('Invalid events or rules:', { events, rules });
    return { messages, outputs };
  }

  // Process events in chronological order
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Process each event
  sortedEvents.forEach(event => {
    console.log('Processing event:', event);
    
    // Sort rules by priority (higher priority first)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);
    
    // Find the first matching rule
    const matchingRule = sortedRules.find(rule => 
      matchEventToRule(
        event,
        {
          type: rule.matches.type,
          conditions: rule.matches.conditions
        },
        variables
      )
    );
    
    if (matchingRule) {
      // Process captures first
      if (matchingRule.captures) {
        const messageType = matchingRule.generates.type;
        if (!outputs[messageType]) {
          outputs[messageType] = {};
        }
        
        Object.entries(matchingRule.captures).forEach(([key, pathTemplate]) => {
          const value = pathTemplate.replace(/\{\{event\.data\.([^}]+)\}\}/g, (_, path) => {
            return path.split('.').reduce((obj: any, key: string) => obj?.[key], event.data) ?? '';
          });
          outputs[messageType][key] = value;
        });
      }

      // Generate message from template
      const message = {
        id: `msg_${event.id}`,
        type: matchingRule.generates.type,
        timestamp: event.timestamp,
        fromEvent: event.id,
        rule: matchingRule.id,
        ...Object.entries(matchingRule.generates.template).reduce((acc, [key, template]) => {
          // Replace variables in template
          let value = template;
          // Replace event data placeholders
          value = value.replace(/\{\{event\.data\.([^}]+)\}\}/g, (_, path) => {
            const eventValue = path.split('.').reduce((obj: any, key: string) => obj?.[key], event.data);
            return eventValue !== undefined ? eventValue : '';
          });
          // Replace variables placeholders
          value = value.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
            const varValue = path.split('.').reduce((obj: any, key: string) => obj?.[key], variables);
            return varValue !== undefined ? varValue : '';
          });
          return { ...acc, [key]: value };
        }, {})
      };
      
      messages.push(message);
    }
  });

  return { messages, outputs };
}

