const admin = require("firebase-admin");

if (!admin.apps.length) {
  // Use local service account only if running locally
  if (process.env.FUNCTIONS_EMULATOR === "true" || process.env.NODE_ENV === "development") {
    const serviceAccount = require("../serviceAccountKey.json");

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Automatically use Firebase credentials when deployed
    admin.initializeApp();
  }
}

const db = admin.firestore();

module.exports = { db, admin };
