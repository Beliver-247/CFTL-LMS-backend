const { Storage } = require('@google-cloud/storage');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');

// Configure GCS
const storage = new Storage({
  keyFilename: path.join(__dirname, '../serviceAccountKey.json'), // adjust if needed
});
const bucket = storage.bucket('cftl-student-profile-images'); // replace with your bucket name

async function uploadCompressedImage(fileBuffer, originalName) {
  const compressedPath = path.join(os.tmpdir(), `${crypto.randomUUID()}.webp`);

  await sharp(fileBuffer)
    .resize(512)
    .webp({ quality: 75 })
    .toFile(compressedPath);

  const destFileName = `students/${Date.now()}_${originalName}.webp`;
  await bucket.upload(compressedPath, {
    destination: destFileName,
    metadata: {
      contentType: 'image/webp',
    },
  });

  fs.unlinkSync(compressedPath);
  return `https://storage.googleapis.com/${bucket.name}/${destFileName}`;
}

module.exports = { uploadCompressedImage };
