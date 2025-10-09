#!/usr/bin/env node

/**
 * Script to upload the FSM test template to cloud storage
 * Usage: node scripts/upload-fsm-template.js
 */

const { createFSMTestTemplate } = require('../lib/templates/save-fsm-template');

async function uploadFSMTemplate() {
  try {
    console.log('🚀 Uploading FSM Test Template...\n');

    // Get the template configuration
    const { nodes, edges } = createFSMTestTemplate();

    // Create the scenario document
    const scenarioId = `fsm-test-${Date.now()}`;
    const scenarioDocument = {
      id: scenarioId,
      name: "FSM Complete Test Workflow",
      description: "Tests FSM with number→message transformation, state transitions, and routing",
      scenario: {
        nodes,
        edges
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: "1.0.0",
        author: "system",
        tags: ["fsm", "test", "workflow", "multiplexer"],
        details: {
          workflow: "Source(1-10) → Processor(num→msg) → FSM(states) → Multiplexer(routing) → Sinks",
          transformations: {
            "1-3": "token_received",
            "4-6": "processing_complete",
            "7-10": "reset"
          },
          states: {
            idle: "→ processing (on token_received)",
            processing: "→ complete (on processing_complete)",
            complete: "→ idle (on reset)"
          }
        }
      }
    };

    // Upload via API
    const response = await fetch('http://localhost:3001/api/admin/scenarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scenarioDocument),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to save template: ${response.status} ${response.statusText}\n${error}`);
    }

    const result = await response.json();

    console.log('✅ FSM Test Template uploaded successfully!\n');
    console.log('📋 Template Details:');
    console.log('   ID:', result.id);
    console.log('   Name:', result.name);
    console.log('   Description:', result.description);
    console.log('\n📦 Template includes:');
    console.log('   • Event Source (Number Generator 1-10)');
    console.log('   • ProcessNode (transforms numbers to messages)');
    console.log('     - 1-3 → "token_received"');
    console.log('     - 4-6 → "processing_complete"');
    console.log('     - 7-10 → "reset"');
    console.log('   • FSM with states: idle, processing, complete');
    console.log('   • Multiplexer routing based on state');
    console.log('   • 3 Sink nodes for different states');
    console.log('\n🎯 You can now load this template from the UI using "Manage Scenarios"');

    return result;
  } catch (error) {
    console.error('❌ Error uploading FSM template:', error.message);
    console.error('\n💡 Make sure the dev server is running on port 3001');
    process.exit(1);
  }
}

// Run the upload
uploadFSMTemplate()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });