// Quick fix for broken template - run this in browser console
async function fixBrokenTemplate() {
  const templateId = 'i9kHpoSxOw2zGx2syGows';

  // Create a fixed scenario
  const fixedScenario = {
    "version": "3.0",
    "nodes": [
      {
        "nodeId": "DataSource_A",
        "displayName": "Raw Material Supplier A",
        "position": {
          "x": 100,
          "y": 100
        },
        "type": "DataSource",
        "interval": 3,
        "outputs": [
          {
            "name": "output",
            "destinationNodeId": "Queue_B", // Fixed: back to original
            "destinationInputName": "input", // Fixed: back to original
            "interface": {
              "type": "SimpleValue",
              "requiredFields": [
                "data.value"
              ]
            }
          }
        ],
        "generation": {
          "type": "random",
          "valueMin": 1,
          "valueMax": 10
        }
      },
      {
        "nodeId": "DataSource_X",
        "displayName": "Raw Material Supplier B",
        "position": {
          "x": 100,
          "y": 350
        },
        "type": "DataSource",
        "interval": 5,
        "outputs": [
          {
            "name": "output",
            "destinationNodeId": "Queue_B", // Fixed: back to original
            "destinationInputName": "input", // Fixed: back to original
            "interface": {
              "type": "SimpleValue",
              "requiredFields": [
                "data.value"
              ]
            }
          }
        ],
        "generation": {
          "type": "random",
          "valueMin": 100,
          "valueMax": 200
        }
      },
      {
        "nodeId": "Queue_B",
        "displayName": "Raw Material Inventory",
        "position": {
          "x": 400,
          "y": 200
        },
        "tags": [
          "engine"
        ],
        "type": "Queue",
        "inputs": [
          {
            "name": "input",
            "interface": {
              "type": "SimpleValue",
              "requiredFields": [
                "data.value"
              ]
            },
            "required": true
          }
        ],
        "outputs": [
          {
            "name": "output",
            "destinationNodeId": "Process_C",
            "destinationInputName": "inputA",
            "interface": {
              "type": "AggregationResult",
              "requiredFields": [
                "data.aggregatedValue"
              ]
            }
          }
        ],
        "aggregation": {
          "method": "sum",
          "formula": "sum(input.data.value)",
          "trigger": {
            "type": "time",
            "window": 10
          }
        },
        "capacity": 10
      },
      {
        "nodeId": "Process_C",
        "displayName": "Manufacturing Process",
        "position": {
          "x": 700,
          "y": 200
        },
        "tags": [
          "engine"
        ],
        "type": "ProcessNode",
        "inputs": [
          {
            "name": "inputA",
            "nodeId": "Queue_B",
            "sourceOutputName": "output",
            "interface": {
              "type": "AggregationResult",
              "requiredFields": [
                "data.aggregatedValue"
              ]
            },
            "alias": "queueB",
            "required": true
          }
        ],
        "outputs": [
          {
            "name": "output1",
            "destinationNodeId": "Queue_D",
            "destinationInputName": "input",
            "interface": {
              "type": "TransformationResult",
              "requiredFields": [
                "data.transformedValue"
              ]
            },
            "transformation": {
              "formula": "queueB.data.aggregatedValue + 10",
              "fieldMapping": {
                "data.transformedValue": "queueB.data.aggregatedValue + 10"
              }
            }
          },
          {
            "name": "output2",
            "destinationNodeId": "Sink_E",
            "destinationInputName": "input",
            "interface": {
              "type": "TransformationResult",
              "requiredFields": [
                "data.transformedValue"
              ]
            },
            "transformation": {
              "formula": "queueB.data.aggregatedValue * 0.5",
              "fieldMapping": {
                "data.transformedValue": "queueB.data.aggregatedValue * 0.5"
              }
            }
          }
        ]
      },
      {
        "nodeId": "Queue_D",
        "displayName": "Intermediate Product Storage2",
        "position": {
          "x": 1056.633515067685,
          "y": 4.982627232000027
        },
        "type": "Queue",
        "inputs": [
          {
            "name": "input",
            "interface": {
              "type": "TransformationResult",
              "requiredFields": [
                "data.transformedValue"
              ]
            },
            "required": true
          }
        ],
        "outputs": [
          {
            "name": "output",
            "destinationNodeId": "Sink_F",
            "destinationInputName": "input",
            "interface": {
              "type": "AggregationResult",
              "requiredFields": [
                "data.aggregatedValue"
              ]
            }
          }
        ],
        "aggregation": {
          "method": "average",
          "formula": "avg(input.data.transformedValue)",
          "trigger": {
            "type": "time",
            "window": 5
          }
        },
        "capacity": 5
      },
      {
        "nodeId": "Sink_E",
        "displayName": "Distribution Center A",
        "position": {
          "x": 1052.806267806268,
          "y": 360.5612535612536
        },
        "type": "Sink",
        "inputs": [
          {
            "name": "input",
            "interface": {
              "type": "Any",
              "requiredFields": [
                "metadata.timestamp"
              ]
            },
            "required": true
          }
        ]
      },
      {
        "nodeId": "Sink_F",
        "displayName": "Final Product Shipment",
        "position": {
          "x": 1452.2635750535978,
          "y": 31.41000851355028
        },
        "type": "Sink",
        "inputs": [
          {
            "name": "input",
            "interface": {
              "type": "Any",
              "requiredFields": [
                "metadata.timestamp"
              ]
            },
            "required": true
          }
        ]
      }
    ],
    "groups": {
      "tags": [
        {
          "name": "engine",
          "color": "#3b82f6",
          "description": "Auto-created tag"
        }
      ],
      "visualMode": "all",
      "activeFilters": [],
      "groupedNodeIds": [],
      "enabledTagGroups": ["engine"] // Keep this so grouping can be re-enabled
    }
  };

  try {
    // Update template using the API
    const response = await fetch(`/api/admin/templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: fixedScenario })
    });

    if (response.ok) {
      console.log('✅ Template fixed successfully!');
      location.reload(); // Reload the page
    } else {
      console.error('❌ Failed to fix template:', await response.text());
    }
  } catch (error) {
    console.error('❌ Error fixing template:', error);
  }
}

// Run the fix
fixBrokenTemplate();