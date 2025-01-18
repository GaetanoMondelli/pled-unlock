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

export function matchEventToRule(
  event: any, 
  rule: MatchRule, 
  variables: Variables = {}
): boolean {
  // First check if event type matches
  if (event.type !== rule.type) {
    return false;
  }

  // Check each condition
  return Object.entries(rule.conditions).every(([path, pattern]) => {
    const value = getValueByPath(event.data, path);
    
    if (typeof pattern !== 'string') return false;

    // Handle variable substitution first
    if (pattern.includes('{{') && pattern.includes('}}')) {
      const variablePath = pattern
        .replace('{{', '')
        .replace('}}', '')
        .trim();
      const variableValue = getValueByPath(variables, variablePath);
      
      // If we have a variable value, use it for comparison
      if (variableValue !== undefined) {
        return value === variableValue;
      }
      // If variable is not found, condition fails
      return false;
    }

    // Handle other patterns
    if (pattern.startsWith('(contains)')) {
      const searchTerm = pattern.replace('(contains)', '').trim();
      return String(value).toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    if (pattern.startsWith('(llm-prompt)')) {
      // For now, always return true for llm-prompt patterns
      return true;
    }

    // Direct equality match
    return value === pattern;
  });
}

export const getValueByPath = (obj: any, path: string): any => {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}; 