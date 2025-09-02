const LAZY_RULE_MATCHING = process.env.NEXT_PUBLIC_LAZY_RULE_MATCHING === "true";

async function isQuestion(text: string): Promise<boolean> {
  try {
    const response = await fetch("/api/check-question", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error("Failed to check question");
    }

    const result = await response.json();
    return result.isQuestion;
  } catch (error) {
    console.error("Error checking if text is question:", error);
    return false;
  }
}

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

export const getValueByPath = (obj: any, path: string): any => {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
};

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
    const value = path.split(".").reduce((obj: any, key: string) => obj?.[key], event.data);

    if (typeof pattern !== "string") return false;

    // Handle special operators
    if (pattern.startsWith("(contains)")) {
      const searchTerm = pattern.replace("(contains)", "").trim().toLowerCase();
      const valueStr = String(value || "").toLowerCase();
      return valueStr.includes(searchTerm);
    }

    if (pattern.startsWith("(llm-prompt)")) {
      return true;
    }

    // Handle template variables
    if (pattern.includes("{{")) {
      const interpolatedPattern = pattern.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
        return path.split(".").reduce((obj: any, key: string) => obj?.[key], variables) ?? "";
      });
      return value === interpolatedPattern;
    }

    // Direct equality match
    return value === pattern;
  });
}

export async function eventMatches(event: any, rule: any): Promise<boolean> {
  // First check if event type matches
  if (rule.type !== event.type) {
    return false;
  }

  // Get conditions from the appropriate place in the rule structure
  if (!rule.conditions) {
    return true;
  }

  const results = await Promise.all(
    Object.entries(rule.conditions).map(async ([path, pattern]) => {
      const value = path.split(".").reduce((obj: any, key: string) => obj?.[key], event.data);

      if (value === undefined) return false;
      if (typeof pattern !== "string") return true;

      // Handle special operators
      if (pattern.startsWith("(contains)")) {
        const searchTerm = pattern.replace("(contains)", "").trim().toLowerCase();
        const valueStr = String(value || "").toLowerCase();
        return valueStr.includes(searchTerm);
      }

      if (pattern.startsWith("(llm-prompt)")) {
        if (process.env.NEXT_PUBLIC_ENABLE_LLM_RULES !== "true") {
          return true;
        }
        return await isQuestion(String(value));
      }

      if (pattern.includes("{{")) {
        return true; // Template variables handled elsewhere
      }

      return value === pattern;
    }),
  );

  return results.every(Boolean);
}

export async function matchEventToRuleAsync(event: any, rule: any, variables: any = {}): Promise<boolean> {
  if (!event || !rule) return false;

  // First check if event type matches
  if (rule.type !== event.type) {
    return false;
  }

  // If there are no conditions, it's a match
  if (!rule.conditions) {
    return true;
  }

  const results = await Promise.all(
    Object.entries(rule.conditions).map(async ([path, pattern]) => {
      const value = path.split(".").reduce((obj: any, key: string) => obj?.[key], event.data);

      if (typeof pattern !== "string") return false;

      if (pattern.startsWith("(contains)")) {
        const searchTerm = pattern.replace("(contains)", "").trim().toLowerCase();
        const valueStr = String(value || "").toLowerCase();
        return valueStr.includes(searchTerm);
      }

      if (pattern.startsWith("(llm-prompt)")) {
        if (process.env.NEXT_PUBLIC_ENABLE_LLM_RULES !== "true") {
          return true;
        }
        return await isQuestion(String(value));
      }

      if (pattern.includes("{{")) {
        const interpolatedPattern = pattern.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
          return path.split(".").reduce((obj: any, key: string) => obj?.[key], variables) ?? "";
        });
        return value === interpolatedPattern;
      }

      return value === pattern;
    }),
  );

  return results.every(Boolean);
}

function getRulePriority(rule: any): number {
  // If priority is explicitly set to 0, use 0. If not set, use 100
  return rule.priority !== undefined ? rule.priority : 100;
}

// export function getMatchingRules(event: any, rules: any[], variables: any = {}): any[] {
//   // Sort rules by priority (highest first)
//   const sortedRules = [...rules].sort((a, b) => getRulePriority(b) - getRulePriority(a));

//   if (LAZY_RULE_MATCHING && false) {
//     // Lazy evaluation - return first matching rule
//     for (const rule of sortedRules) {
//       if (matchEventToRule(event, rule, variables)) {
//         return [rule];
//       }
//     }
//     return [];
//   } else {
//     // Evaluate all rules
//     return rules.filter(rule => matchEventToRule(event, rule, variables));
//   }
// }
