export default function ProtocolDocsPage() {
  return (
    <div className="container mx-auto px-6 py-10 prose dark:prose-invert">
      <h1>Workflow Protocol</h1>
      <p>
        This document describes the versioned workflow protocol used by the Template Editor and Simulator. It defines
        interoperable node types and their required fields, excluding any UI-specific properties such as coordinates.
      </p>

      <h2>Version</h2>
      <p>
        <code>version</code>: string literal. Current: <code>"1.0"</code>
      </p>

      <h2>Node Types</h2>
      <h3>DataSource</h3>
      <ul>
        <li>nodeId: string</li>
        <li>displayName: string</li>
        <li>type: "DataSource"</li>
        <li>interval: number (seconds between emissions)</li>
        <li>valueMin: number</li>
        <li>valueMax: number</li>
        <li>destinationNodeId: string (must reference an existing node)</li>
      </ul>

      <h3>Queue</h3>
      <ul>
        <li>nodeId: string</li>
        <li>displayName: string</li>
        <li>type: "Queue"</li>
        <li>timeWindow: number (aggregation window in seconds)</li>
        <li>aggregationMethod: one of: sum | average | count | first | last</li>
        <li>capacity: number (optional)</li>
        <li>destinationNodeId: string</li>
      </ul>

      <h3>ProcessNode</h3>
      <ul>
        <li>nodeId: string</li>
        <li>displayName: string</li>
        <li>type: "ProcessNode"</li>
        <li>inputNodeIds: string[] (non-empty)</li>
        <li>
          outputs: array of objects with <code>formula</code> (string) and <code>destinationNodeId</code> (string)
        </li>
      </ul>

      <h3>Sink</h3>
      <ul>
        <li>nodeId: string</li>
        <li>displayName: string</li>
        <li>type: "Sink"</li>
      </ul>

      <h2>Scenario</h2>
      <p>
        A Scenario contains: <code>version</code> and <code>nodes</code>. All cross-references are validated: every
        destinationNodeId and inputNodeId must reference an existing node in the same graph.
      </p>

      <h2>JSON Schema</h2>
      <p>
        Generate a machine-readable JSON Schema with the script: <code>yarn protocol:jsonschema</code>. The output is
        written to <code>lib/workflow/protocol.schema.json</code>.
      </p>
    </div>
  );
}
