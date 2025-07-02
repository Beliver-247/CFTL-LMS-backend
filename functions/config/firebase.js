const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

if (!admin.apps.length) {
  // Check if serviceAccountKey.json exists (for local dev)
  const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");
  const useServiceAccount =
    process.env.FUNCTIONS_EMULATOR === "true" && fs.existsSync(serviceAccountPath);

  if (useServiceAccount) {
    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Use default credentials in Firebase deploy or GitHub Actions
    admin.initializeApp();
  }
}

const db = admin.firestore();

module.exports = { db, admin };
