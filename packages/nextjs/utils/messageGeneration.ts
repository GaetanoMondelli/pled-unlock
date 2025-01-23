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

// Add the formatTemplateContent function
function formatTemplateContent(template: string, data: any): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = path.split('.').reduce((obj: any, key: string) => {
      return obj?.[key];
    }, data);
    return value !== undefined ? String(value) : '';
  });
}

export function generateMessages(events: any[], rules: any[], variables: any) {
  const messages: any[] = [];
  const outputs: Record<string, any> = {};

  events.forEach(event => {
    rules.forEach(rule => {
      if (matchEventToRule(event, rule.matches, variables)) {
        // Capture outputs if specified
        if (rule.captures) {
          outputs[rule.generates.type] = Object.entries(rule.captures).reduce((acc, [key, value]) => {
            acc[key] = formatTemplateContent(value as string, {
              event,
              ...variables
            });
            return acc;
          }, {} as Record<string, any>);
        }

        // Generate message
        const message = {
          id: `msg_${event.id}`,
          type: rule.generates.type,
          title: formatTemplateContent(rule.generates.template.title, {
            event,
            captures: outputs[rule.generates.type],
            ...variables
          }),
          content: formatTemplateContent(rule.generates.template.content, {
            event,
            captures: outputs[rule.generates.type],
            ...variables
          }),
          timestamp: event.data.time || event.timestamp, // Use event.data.time first, fall back to event.timestamp
          fromEvent: event.id,
          rule: rule.id,
          event: event // Include the full event for reference
        };

        messages.push(message);
      }
    });
  });

  return { messages, outputs };
}

