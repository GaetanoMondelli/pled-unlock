const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { getStorage } = require("firebase-admin/storage");
const { initializeApp, cert } = require("firebase-admin/app");
const fs = require("fs");

// Initialize Firebase Admin with service account
try {
  const serviceAccountBuffer = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT || "", "base64");
  const serviceAccount = JSON.parse(serviceAccountBuffer.toString("utf8"));
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin. Error details:", error);
  if (error instanceof SyntaxError) {
    console.error("Service account content:", process.env.FIREBASE_SERVICE_ACCOUNT?.substring(0, 50) + "...");
  }
  process.exit(1);
}

const bucket = getStorage().bucket();
const PLED_PATH = path.join(__dirname, "../public/pled.json");
async function downloadPled() {
  try {
    const file = bucket.file("pled.json");
    const [exists] = await file.exists();

    if (!exists) {
      throw new Error("pled.json does not exist in Firebase Storage");
    }

    await file.download({ destination: PLED_PATH });
    console.log("✅ Successfully downloaded pled.json from Firebase Storage");
  } catch (error) {
    console.error("❌ Error downloading pled.json:", error);
    process.exit(1);
  }
}

async function uploadPled() {
  try {
    if (!fs.existsSync(PLED_PATH)) {
      throw new Error("pled.json does not exist in public directory");
    }

    await bucket.upload(PLED_PATH, {
      destination: "pled.json",
      metadata: {
        contentType: "application/json",
      },
    });
    console.log("✅ Successfully uploaded pled.json to Firebase Storage");
  } catch (error) {
    console.error("❌ Error uploading pled.json:", error);
    process.exit(1);
  }
}

// Handle command line arguments
const command = process.argv[2];
if (command === "download") {
  downloadPled();
} else if (command === "upload") {
  uploadPled();
} else {
  console.error("Please specify either 'download' or 'upload'");
  process.exit(1);
}
