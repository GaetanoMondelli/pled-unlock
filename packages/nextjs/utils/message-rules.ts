export function getNotMatchingReason(event: any, rule: any): string {
  // First check if event type matches
  if (rule.type !== event.type) {
    return `Event type '${event.type}' doesn't match rule type '${rule.type}'`;
  }

  // Get conditions from the appropriate place in the rule structure
  if (!rule.conditions) {
    return 'No conditions defined';
  }

  const failedConditions = Object.entries(rule.conditions)
    .map(([path, pattern]) => {
      const value = path.split('.')
        .reduce((obj: any, key: string) => obj?.[key], event.data);
      
      if (value === undefined) {
        return `Path '${path}' not found in event data`;
      }

      if (typeof pattern !== 'string') return null;

      // Handle special operators
      if (pattern.startsWith('(contains)')) {
        const searchTerm = pattern.replace('(contains)', '').trim().toLowerCase();
        const valueStr = String(value || '').toLowerCase();
        const matches = valueStr.includes(searchTerm);
        return matches ? null : 
          `Value '${value}' does not contain '${searchTerm}'`;
      }

      if (pattern.startsWith('(llm-prompt)')) {
        return null; // Always matches
      }

      if (pattern.includes('{{')) {
        return null; // Template variables handled elsewhere
      }

      return value !== pattern ? 
        `Expected '${pattern}' at path '${path}', but got '${value}'` : null;
    })
    .filter(Boolean);

  return failedConditions.join(', ');
} 