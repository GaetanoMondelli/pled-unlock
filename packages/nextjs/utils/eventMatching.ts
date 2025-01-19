type Condition = {
  [key: string]: string;
};

type MatchRule = {
  type: string;
  conditions: Condition;
};

interface Variables {
  candidate?: {
    email?: string;
    name?: string;
  };
  company?: {
    email?: string;
    department?: string;
  };
  [key: string]: any;
}

export function matchEventToRule(event: any, rule: any, variables: any = {}) {
  if (!event || !rule) return false;

  // First check if event type matches
  if (rule.type !== event.type) {
    return false;
  }

  // If there are no conditions, it's a match
  if (!rule.conditions) {
    return true;
  }

  // Check all conditions
  return Object.entries(rule.conditions).every(([path, pattern]) => {
    const value = path.split('.').reduce((obj: any, key: string) => obj?.[key], event.data);
    
    if (typeof pattern !== 'string') return false;

    // Handle special operators
    if (pattern.startsWith('(contains)')) {
      const searchTerm = pattern.replace('(contains)', '').trim().toLowerCase();
      const valueStr = String(value || '').toLowerCase();
      return valueStr.includes(searchTerm);
    }
    
    if (pattern.startsWith('(llm-prompt)')) {
      return true;
    }

    // Handle template variables
    if (pattern.includes('{{')) {
      const interpolatedPattern = pattern.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
        return path.split('.')
          .reduce((obj: any, key: string) => obj?.[key], variables) ?? '';
      });
      return value === interpolatedPattern;
    }

    // Direct equality match
    return value === pattern;
  });
}

export const getValueByPath = (obj: any, path: string): any => {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}; 