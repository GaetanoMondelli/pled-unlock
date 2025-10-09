import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { PLEDStorageService } from "@/lib/pled-storage-service";
import { fsmTestTemplate } from "@/lib/templates/fsm-test-template";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAJfmfvVmQ9sG0opSLVn0L9aUCxDVL5Els",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "docusign-ai.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "docusign-ai",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "docusign-ai.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1055607166697",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1055607166697:web:cbdabb4a17c73c1528e5dd"
};

async function saveFSMTemplate() {
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const storage = getStorage(app);
    const storageService = new PLEDStorageService(storage);

    // Create the template data structure
    const templateId = `fsm-test-template-${Date.now()}`;
    const templateData = {
      id: templateId,
      name: "FSM Test Template - Complete Workflow",
      description: "Event Source → ProcessNode (number to message) → FSM → Multiplexer → Sinks",
      nodes: fsmTestTemplate.nodes,
      edges: fsmTestTemplate.edges,
      metadata: {
        ...fsmTestTemplate.metadata,
        templateType: "fsm-test",
        createdAt: new Date().toISOString(),
        author: "system",
        tags: ["fsm", "test", "workflow", "multiplexer"]
      }
    };

    // Save to templates collection
    const savedTemplate = await storageService.saveTemplate(templateData);

    console.log("✅ FSM Template saved successfully!");
    console.log("Template ID:", savedTemplate.id);
    console.log("Template Name:", savedTemplate.name);
    console.log("\nTemplate includes:");
    console.log("- Event Source (Number Generator 1-10)");
    console.log("- ProcessNode (transforms numbers to messages)");
    console.log("  • 1-3 → 'token_received'");
    console.log("  • 4-6 → 'processing_complete'");
    console.log("  • 7-10 → 'reset'");
    console.log("- FSM with states: idle, processing, complete");
    console.log("- Multiplexer routing based on state");
    console.log("- 3 Sink nodes for different states");

    return savedTemplate;
  } catch (error) {
    console.error("❌ Error saving template:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  saveFSMTemplate()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { saveFSMTemplate };