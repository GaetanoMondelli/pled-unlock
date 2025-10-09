#!/usr/bin/env node

/**
 * Script to manage templates (list and delete)
 * Usage:
 *   node scripts/manage-templates.js list
 *   node scripts/manage-templates.js delete <template-id>
 */

const API_BASE = 'http://localhost:3001/api/admin';

async function listTemplates() {
  try {
    const response = await fetch(`${API_BASE}/scenarios`);

    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.status}`);
    }

    const templates = await response.json();

    if (templates.length === 0) {
      console.log('📭 No templates found in cloud storage');
      return;
    }

    console.log(`\n📚 Found ${templates.length} template(s):\n`);
    console.log('─'.repeat(80));

    templates.forEach((template, index) => {
      console.log(`\n${index + 1}. ${template.name}`);
      console.log(`   ID: ${template.id}`);
      console.log(`   Description: ${template.description || 'No description'}`);
      console.log(`   Version: ${template.version}`);
      console.log(`   Created: ${new Date(template.createdAt).toLocaleString()}`);
      if (template.tags && template.tags.length > 0) {
        console.log(`   Tags: ${template.tags.join(', ')}`);
      }
      if (template.isDefault) {
        console.log(`   ⭐ DEFAULT TEMPLATE`);
      }
    });

    console.log('\n' + '─'.repeat(80));
    console.log('\n💡 To delete a template, run: node scripts/manage-templates.js delete <template-id>');

  } catch (error) {
    console.error('❌ Error listing templates:', error.message);
    process.exit(1);
  }
}

async function deleteTemplate(templateId) {
  try {
    if (!templateId) {
      console.error('❌ Please provide a template ID to delete');
      console.error('   Usage: node scripts/manage-templates.js delete <template-id>');
      process.exit(1);
    }

    // First check if template exists
    const listResponse = await fetch(`${API_BASE}/scenarios`);
    const templates = await listResponse.json();
    const template = templates.find(t => t.id === templateId);

    if (!template) {
      console.error(`❌ Template with ID "${templateId}" not found`);
      console.error('\n💡 Run "node scripts/manage-templates.js list" to see available templates');
      process.exit(1);
    }

    console.log(`\n🗑️  Deleting template: ${template.name}`);
    console.log(`   ID: ${template.id}`);

    // Confirm deletion
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    await new Promise((resolve) => {
      readline.question('\n⚠️  Are you sure you want to delete this template? (y/N): ', (answer) => {
        readline.close();
        if (answer.toLowerCase() !== 'y') {
          console.log('❌ Deletion cancelled');
          process.exit(0);
        }
        resolve();
      });
    });

    // Delete the template
    const response = await fetch(`${API_BASE}/scenarios/${templateId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete template: ${response.status} ${error}`);
    }

    console.log('\n✅ Template deleted successfully!');

  } catch (error) {
    console.error('❌ Error deleting template:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  console.log('🔧 Template Manager\n');

  switch (command) {
    case 'list':
      await listTemplates();
      break;

    case 'delete':
      await deleteTemplate(args[0]);
      break;

    default:
      console.log('📖 Usage:');
      console.log('   node scripts/manage-templates.js list              - List all templates');
      console.log('   node scripts/manage-templates.js delete <id>       - Delete a template by ID');
      console.log('\n💡 Make sure the dev server is running on port 3001');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});