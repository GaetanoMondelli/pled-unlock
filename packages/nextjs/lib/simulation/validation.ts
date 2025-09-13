import { type AnyNode, type Scenario, ScenarioSchema } from "./types";

export function validateScenario(data: any): { scenario: Scenario | null; errors: string[] } {
  const result = ScenarioSchema.safeParse(data);
  if (!result.success) {
    return {
      scenario: null,
      errors: result.error.issues.map((e: any) => `${e.path.join(".")}: ${e.message}`),
    };
  }

  const scenario = result.data;
  const errors: string[] = [];
  const nodeIds = new Set(scenario.nodes.map(node => node.nodeId));

  scenario.nodes.forEach(node => {
    switch (node.type) {
      case "DataSource":
        if (node.destinationNodeId && node.destinationNodeId.trim() !== "" && !nodeIds.has(node.destinationNodeId)) {
          errors.push(`DataSource "${node.nodeId}": destinationNodeId "${node.destinationNodeId}" does not exist.`);
        }
        if (node.valueMin > node.valueMax) {
          errors.push(`DataSource "${node.nodeId}": valueMin cannot be greater than valueMax.`);
        }
        break;
      case "Queue":
        if (node.destinationNodeId && node.destinationNodeId.trim() !== "" && !nodeIds.has(node.destinationNodeId)) {
          errors.push(`Queue "${node.nodeId}": destinationNodeId "${node.destinationNodeId}" does not exist.`);
        }
        break;
      case "ProcessNode":
        node.inputNodeIds.forEach(inputId => {
          if (inputId && inputId.trim() !== "" && !nodeIds.has(inputId)) {
            errors.push(`ProcessNode "${node.nodeId}": inputNodeId "${inputId}" does not exist.`);
          }
        });
        node.outputs.forEach(output => {
          if (output.destinationNodeId && output.destinationNodeId.trim() !== "" && !nodeIds.has(output.destinationNodeId)) {
            errors.push(
              `ProcessNode "${node.nodeId}" output: destinationNodeId "${output.destinationNodeId}" does not exist.`,
            );
          }
        });
        // Check if nodes targeting this ProcessNode are consistent with inputNodeIds
        const sourcesForProcessNode = scenario.nodes
          .filter(n => {
            if (n.type === "DataSource" || n.type === "Queue") return n.destinationNodeId === node.nodeId;
            if (n.type === "ProcessNode") return n.outputs.some(o => o.destinationNodeId === node.nodeId);
            return false;
          })
          .map(n => n.nodeId);

        node.inputNodeIds.forEach(inputId => {
          if (!sourcesForProcessNode.includes(inputId)) {
            // This check might be too strict if graph can be partially defined or built dynamically
            // For now, it's a good sanity check
            // errors.push(`ProcessNode "${node.nodeId}": inputNodeId "${inputId}" is declared but no node targets it as a destination for this ProcessNode.`);
          }
        });

        break;
    }
  });

  if (errors.length > 0) {
    return { scenario: null, errors };
  }

  return { scenario, errors: [] };
}
