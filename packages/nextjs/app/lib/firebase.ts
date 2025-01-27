var admin = require("firebase-admin");

// var serviceAccount = require("./serviceAccountKey.json");
// console.log('FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT);
const serviceAccountBuffer = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT || '', 'base64');


// Parse it into a JavaScript object
const serviceAccount = JSON.parse(serviceAccountBuffer.toString('utf8'));


if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const bucket = admin.storage().bucket();
export { bucket };
