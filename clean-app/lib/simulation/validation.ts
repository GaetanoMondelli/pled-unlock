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
        // Validate generation config
        if (node.generation.valueMin > node.generation.valueMax) {
          errors.push(`DataSource "${node.nodeId}": generation valueMin cannot be greater than valueMax.`);
        }
        // Validate outputs
        node.outputs.forEach(output => {
          if (output.destinationNodeId && !nodeIds.has(output.destinationNodeId)) {
            errors.push(`DataSource "${node.nodeId}": output destinationNodeId "${output.destinationNodeId}" does not exist.`);
          }
        });
        break;

      case "Queue":
        // Validate outputs
        node.outputs.forEach(output => {
          if (output.destinationNodeId && !nodeIds.has(output.destinationNodeId)) {
            errors.push(`Queue "${node.nodeId}": output destinationNodeId "${output.destinationNodeId}" does not exist.`);
          }
        });
        break;

      case "ProcessNode":
        // Validate inputs reference existing nodes
        node.inputs.forEach(input => {
          if (input.nodeId && !nodeIds.has(input.nodeId)) {
            errors.push(`ProcessNode "${node.nodeId}": input nodeId "${input.nodeId}" does not exist.`);
          }
        });
        // Validate outputs
        node.outputs.forEach(output => {
          if (output.destinationNodeId && !nodeIds.has(output.destinationNodeId)) {
            errors.push(`ProcessNode "${node.nodeId}": output destinationNodeId "${output.destinationNodeId}" does not exist.`);
          }
        });
        break;

      case "Sink":
        // Sink nodes don't need additional validation beyond schema
        break;

      case "StateMultiplexer":
        // Validate outputs
        node.outputs.forEach(output => {
          if (output.destinationNodeId && !nodeIds.has(output.destinationNodeId)) {
            errors.push(`StateMultiplexer "${node.nodeId}": output destinationNodeId "${output.destinationNodeId}" does not exist.`);
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
