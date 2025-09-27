// Simple Firebase admin setup that reuses existing configuration
// This file should only run on the server side
import * as admin from "firebase-admin";

// Use existing Firebase setup pattern
const serviceAccountBuffer = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT || "", "base64");

let app: admin.app.App;

function getFirebaseApp() {
  if (app) return app;

  // Find existing app or create new one
  if (admin.apps.length > 0) {
    app = admin.apps[0] as admin.app.App;
    return app;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountBuffer.toString("utf8"));

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

    console.log("Firebase initialized for admin operations");
    return app;
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    throw error;
  }
}

export function getFirestore() {
  const firebaseApp = getFirebaseApp();
  return firebaseApp.firestore();
}