#!/usr/bin/env ts-node

/**
 * PLED Firebase Initialization Script
 *
 * This script initializes the PLED (Procedural Legal Entity Documents) collection
 * structure in Firebase Firestore. It creates the necessary documents and
 * subcollections to support the PLED service.
 *
 * Usage: npx tsx scripts/init-pled-firebase.ts
 */

import { pledService } from '../lib/firebase/pled-service';

async function initializePledFirebase() {
  console.log('🚀 Initializing PLED Firebase structure...');

  try {
    // Check Firebase connection
    console.log('🔍 Checking Firebase connection...');
    const isConnected = await pledService.checkConnection();

    if (!isConnected) {
      console.error('❌ Failed to connect to Firebase');
      process.exit(1);
    }

    console.log('✅ Firebase connection successful');

    // Initialize PLED collection
    console.log('📁 Initializing PLED collection structure...');
    await pledService.initializePledCollection();

    console.log('✅ PLED collection initialized successfully');

    // List templates to verify setup
    console.log('📋 Verifying template setup...');
    const templates = await pledService.listTemplates();
    console.log(`✅ Found ${templates.length} templates in PLED collection`);

    if (templates.length > 0) {
      console.log('📄 Templates:');
      templates.forEach((template, index) => {
        console.log(`  ${index + 1}. ${template.name} (${template.id})`);
        console.log(`     Description: ${template.description || 'No description'}`);
        console.log(`     Version: ${template.version}`);
        console.log(`     Default: ${template.isDefault ? 'Yes' : 'No'}`);
        console.log('');
      });
    }

    console.log('🎉 PLED Firebase initialization completed successfully!');
    console.log('');
    console.log('📍 Collection structure created:');
    console.log('   📂 pled/');
    console.log('     📄 documents/');
    console.log('       📁 templates/ (subcollection)');
    console.log('       📁 executions/ (subcollection)');
    console.log('');
    console.log('🔧 You can now use the PLED service in your application.');

  } catch (error) {
    console.error('❌ Error initializing PLED Firebase:', error);

    if (error instanceof Error) {
      if (error.message.includes('FAILED_PRECONDITION') ||
          error.message.includes('Datastore Mode') ||
          error.message.includes('Firestore API is not available')) {
        console.error('');
        console.error('🚨 Firebase Configuration Issue Detected:');
        console.error('   Your Firebase project appears to be in "Datastore Mode"');
        console.error('   but the application is trying to use "Firestore Mode" APIs.');
        console.error('');
        console.error('🔧 To fix this:');
        console.error('   1. Go to https://console.firebase.google.com');
        console.error('   2. Select your project');
        console.error('   3. Go to Firestore Database');
        console.error('   4. If prompted, choose "Firestore Native Mode"');
        console.error('   5. Or create a new Firebase project with Firestore enabled');
        console.error('');
      }
    }

    process.exit(1);
  }
}

// Run the initialization
if (require.main === module) {
  initializePledFirebase().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { initializePledFirebase };