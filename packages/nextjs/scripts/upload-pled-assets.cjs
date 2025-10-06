#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');

const ROOT = path.join(__dirname, '../data/pled');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadServiceAccount() {
  const encoded = requireEnv('FIREBASE_SERVICE_ACCOUNT');
  const buffer = Buffer.from(encoded, 'base64');
  return JSON.parse(buffer.toString('utf8'));
}

function listFiles(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return [full];
  });
}

function listDirectories(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
}

async function uploadFiles(bucketPathPrefix, files, baseDir, bucket) {
  if (files.length === 0) return;

  for (const filePath of files) {
    const rel = path.relative(baseDir, filePath);
    const destination = path.join(bucketPathPrefix, rel).replace(/\\/g, '/');
    await bucket.upload(filePath, {
      destination,
      metadata: { contentType: 'application/json' },
    });
    console.log(`Uploaded ${filePath} -> ${destination}`);
  }
}

async function main() {
  const serviceAccount = loadServiceAccount();
  const storageBucket = requireEnv('FIREBASE_STORAGE_BUCKET');
  const userId = process.env.PLED_STORAGE_USER || 'admin';
  const templateId = process.env.PLED_TEMPLATE_ID;

  initializeApp({
    credential: cert(serviceAccount),
    storageBucket,
  });

  const userDir = path.join(ROOT, userId);
  if (!fs.existsSync(userDir)) {
    throw new Error(`No data found for user "${userId}" in ${userDir}`);
  }

  const templatesToUpload = templateId
    ? [templateId]
    : listDirectories(userDir);

  if (templatesToUpload.length === 0) {
    console.warn(`No templates found for user "${userId}".`);
    return;
  }

  const bucket = getStorage().bucket();

  for (const tmpl of templatesToUpload) {
    const templateDirPath = path.join(userDir, tmpl);
    const templateFile = path.join(templateDirPath, 'template.json');
    const executionsDirPath = path.join(templateDirPath, 'executions');

    if (!fs.existsSync(templateFile)) {
      console.warn(`Skipping template "${tmpl}" (missing template.json)`);
      continue;
    }

    await bucket.upload(templateFile, {
      destination: path.join('pled', userId, tmpl, 'template.json').replace(/\\/g, '/'),
      metadata: { contentType: 'application/json' },
    });
    console.log(`Uploaded ${templateFile} -> pled/${userId}/${tmpl}/template.json`);

    const executionFiles = listFiles(executionsDirPath);
    if (executionFiles.length > 0) {
      await uploadFiles(path.join('pled', userId, tmpl, 'executions').replace(/\\/g, '/'), executionFiles, executionsDirPath, bucket);
    }
  }

  console.log('Upload completed.');
}

main().catch(err => {
  console.error('Upload failed:', err);
  process.exitCode = 1;
});
