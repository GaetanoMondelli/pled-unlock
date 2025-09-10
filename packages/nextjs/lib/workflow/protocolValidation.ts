import { ProtocolScenario, ProtocolScenarioSchema } from "./protocolSchema";

export function validateProtocolScenario(data: unknown): { scenario: ProtocolScenario | null; errors: string[] } {
  const parsed = ProtocolScenarioSchema.safeParse(data);
  if (!parsed.success) {
    return {
      scenario: null,
      errors: parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`),
    };
  }

  const scenario = parsed.data;
  const errors: string[] = [];

  const nodeIds = new Set(scenario.nodes.map(n => n.nodeId));

  for (const node of scenario.nodes) {
    if (node.type === "DataSource" || node.type === "Queue") {
      if (!nodeIds.has(node.destinationNodeId)) {
        errors.push(`${node.type} "${node.nodeId}": destinationNodeId "${node.destinationNodeId}" does not exist.`);
      }
    }

    if (node.type === "ProcessNode") {
      for (const inputId of node.inputNodeIds) {
        if (!nodeIds.has(inputId)) {
          errors.push(`ProcessNode "${node.nodeId}": inputNodeId "${inputId}" does not exist.`);
        }
      }
      for (const out of node.outputs) {
        if (!nodeIds.has(out.destinationNodeId)) {
          errors.push(
            `ProcessNode "${node.nodeId}" output: destinationNodeId "${out.destinationNodeId}" does not exist.`,
          );
        }
      }
    }
  }

  return { scenario: errors.length ? null : scenario, errors };
}
