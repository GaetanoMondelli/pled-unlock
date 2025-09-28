import { ScenarioSchema, GroupNodeSchema } from '../lib/simulation/types';

// Test scenario with grouping features
const testGroupedScenario = {
  "version": "3.0",
  "groups": {
    "tags": [
      {
        "name": "data-sources",
        "color": "#22c55e",
        "description": "Data generation nodes"
      },
      {
        "name": "processing", 
        "color": "#3b82f6",
        "description": "Data processing nodes"
      }
    ],
    "visualMode": "all",
    "activeFilters": []
  },
  "nodes": [
    {
      "nodeId": "source1",
      "displayName": "Test Source",
      "position": { "x": 100, "y": 100 },
      "type": "DataSource",
      "tags": ["data-sources"],
      "interval": 5,
      "outputs": [{
        "name": "output",
        "destinationNodeId": "sink1",
        "destinationInputName": "input",
        "interface": { "type": "SimpleValue", "requiredFields": [] }
      }],
      "generation": { "type": "constant", "value": 1 }
    },
    {
      "nodeId": "sink1", 
      "displayName": "Test Sink",
      "position": { "x": 300, "y": 100 },
      "type": "Sink",
      "tags": ["processing"],
      "inputs": [{
        "name": "input",
        "interface": { "type": "SimpleValue", "requiredFields": [] },
        "required": true
      }]
    },
    {
      "nodeId": "group1",
      "displayName": "Test Group",
      "position": { "x": 50, "y": 50 },
      "type": "Group",
      "groupName": "Test Group",
      "groupColor": "#6366f1",
      "containedNodes": ["source1"],
      "isCollapsed": false,
      "inputs": [],
      "outputs": [{
        "name": "output",
        "destinationNodeId": "sink1",
        "destinationInputName": "input",
        "interface": { "type": "SimpleValue", "requiredFields": [] }
      }]
    }
  ]
};

// Validate the schema
try {
  const validatedScenario = ScenarioSchema.parse(testGroupedScenario);
  console.log('✅ Scenario schema validation passed');
  console.log('Groups config:', validatedScenario.groups);
  console.log('Node count:', validatedScenario.nodes.length);
  
  // Test group node specifically
  const groupNode = validatedScenario.nodes.find(n => n.type === 'Group');
  if (groupNode) {
    const validatedGroup = GroupNodeSchema.parse(groupNode);
    console.log('✅ Group node validation passed');
    console.log('Group contains nodes:', validatedGroup.containedNodes);
  }
  
  // Test tag filtering
  const taggedNodes = validatedScenario.nodes.filter(n => 
    n.tags && n.tags.includes('data-sources')
  );
  console.log('✅ Tag filtering works, found nodes:', taggedNodes.length);
  
} catch (error) {
  console.error('❌ Validation failed:', error);
}

export { testGroupedScenario };