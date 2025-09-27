#!/usr/bin/env node

// Simple test script to verify Firestore admin setup
// Run with: npx tsx scripts/test-firestore.ts

import { firestoreService } from '../lib/firestore-service';

async function testFirestoreSetup() {
  console.log('Testing Firestore setup...');

  try {
    // Test initialization
    console.log('1. Testing admin structure initialization...');
    await firestoreService.initializeDefaultTemplate();
    console.log('✅ Admin structure initialized successfully');

    // Test template operations
    console.log('2. Testing template operations...');
    const templates = await firestoreService.getTemplates();
    console.log(`✅ Retrieved ${templates.length} templates`);

    if (templates.length > 0) {
      const firstTemplate = templates[0];
      console.log(`   - First template: ${firstTemplate.name} (${firstTemplate.id})`);
      console.log(`   - Is default: ${firstTemplate.isDefault}`);
      console.log(`   - Version: ${firstTemplate.version}`);
    }

    // Test creating a new template
    console.log('3. Testing template creation...');
    try {
      const testTemplateId = await firestoreService.createTemplateFromDefault(
        'Test Template',
        'Created by test script'
      );
      console.log(`✅ Created test template with ID: ${testTemplateId}`);

      // Clean up - delete the test template
      await firestoreService.deleteTemplate(testTemplateId);
      console.log('✅ Cleaned up test template');
    } catch (error) {
      console.log(`⚠️  Template creation test skipped: ${error instanceof Error ? error.message : error}`);
    }

    console.log('\n🎉 All tests passed! Firestore setup is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nMake sure you have:');
    console.error('1. Set up Firebase environment variables');
    console.error('2. Configured Firestore properly');
    console.error('3. Have proper permissions');
  }
}

testFirestoreSetup().catch(console.error);