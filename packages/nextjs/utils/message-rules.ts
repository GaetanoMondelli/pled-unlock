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

export async function getNotMatchingReason(event: any, rule: any): Promise<string> {
  // First check if event type matches
  if (rule.type !== event.type) {
    return `Event type '${event.type}' doesn't match rule type '${rule.type}'`;
  }

  // Get conditions from the appropriate place in the rule structure
  if (!rule.conditions) {
    return "No conditions defined";
  }

  const failedConditions = await Promise.all(
    Object.entries(rule.conditions).map(async ([path, pattern]) => {
      const value = path.split(".").reduce((obj: any, key: string) => obj?.[key], event.data);

      if (value === undefined) {
        return `Path '${path}' not found in event data`;
      }

      if (typeof pattern !== "string") return null;

      // Handle special operators
      if (pattern.startsWith("(contains)")) {
        const searchTerm = pattern.replace("(contains)", "").trim().toLowerCase();
        const valueStr = String(value || "").toLowerCase();
        const matches = valueStr.includes(searchTerm);
        return matches ? null : `Value '${value}' does not contain '${searchTerm}'`;
      }

      if (pattern.startsWith("(llm-prompt)")) {
        // Only process if NEXT_PUBLIC_ENABLE_LLM_RULES is enabled
        if (process.env.NEXT_PUBLIC_ENABLE_LLM_RULES !== "true") {
          return null;
        }

        const isQuestionResult = await isQuestion(String(value));
        return isQuestionResult ? null : `Text '${value}' is not a question according to LLM`;
      }

      if (pattern.includes("{{")) {
        return null; // Template variables handled elsewhere
      }

      return value !== pattern ? `Expected '${pattern}' at path '${path}', but got '${value}'` : null;
    }),
  );

  return failedConditions.filter(Boolean).join(", ");
}
