// uploadController.js
process.env.GOOGLE_APPLICATION_CREDENTIALS = './keys/firebase-service-account.json';
const { Storage } = require('@google-cloud/storage');
const { v4: uuidv4 } = require('uuid');

// ✅ Define once, globally
const bucketName = process.env.GCS_BUCKET || 'cftl-lms.firebasestorage.app';
const storage = new Storage(); // <--- Moved here

exports.getSignedUrl = async (req, res) => {
  try {
    const { fileType, fileName } = req.body;
    if (!fileType || !fileName) {
      return res.status(400).json({ error: 'Missing fileType or fileName' });
    }

    const destination = `receipts/${uuidv4()}_${fileName}`;
    const options = {
      version: 'v4',
      action: 'write',
      expires: Date.now() + 5 * 60 * 1000,
      contentType: fileType,
    };

    const [url] = await storage
      .bucket(bucketName)
      .file(destination)
      .getSignedUrl(options);

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(destination)}?alt=media`;

    res.status(200).json({ uploadUrl: url, receiptUrl: publicUrl });
  } catch (err) {
    console.error('Signed URL error:', err);
    res.status(500).json({ error: 'Could not generate signed URL' });
  }
};

exports.getViewUrl = async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'Missing filePath' });
    }

    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 5 * 60 * 1000,
    };

    const [signedUrl] = await storage
      .bucket(bucketName)
      .file(filePath)
      .getSignedUrl(options);

    res.status(200).json({ signedUrl });
  } catch (err) {
    console.error('View URL error:', err);
    res.status(500).json({ error: 'Could not generate view URL' });
  }
};
