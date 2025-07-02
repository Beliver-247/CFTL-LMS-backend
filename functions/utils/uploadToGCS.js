const { Storage } = require('@google-cloud/storage');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');

const storage = new Storage({
  keyFilename: path.join(__dirname, '../serviceAccountKey.json'),
});

const bucket = storage.bucket('cftl-student-profile-images');

async function uploadCompressedImage(fileBuffer, originalName) {
  if (!fileBuffer) {
    throw new Error('No file buffer provided to uploadCompressedImage');
  }

  const uniqueId = crypto.randomUUID();
  const compressedPath = path.join(os.tmpdir(), `${uniqueId}.webp`);
  const destFileName = `students/${Date.now()}_${originalName}.webp`;

  try {
    console.log("🛠 Compressing image...");
    await sharp(fileBuffer)
      .resize(512)
      .webp({ quality: 75 })
      .toFile(compressedPath);

    console.log("📤 Uploading to GCS:", destFileName);
    await bucket.upload(compressedPath, {
      destination: destFileName,
      metadata: {
        contentType: 'image/webp',
      },
    });

    console.log("✅ Upload complete");
    return `https://storage.googleapis.com/${bucket.name}/${destFileName}`;
  } catch (err) {
    console.error("❌ uploadCompressedImage error:", err);
    throw err;
  } finally {
    // Always clean up temp file
    if (fs.existsSync(compressedPath)) {
      fs.unlinkSync(compressedPath);
    }
  }
}

module.exports = { uploadCompressedImage };
