const Busboy = require('busboy');
const { uploadCompressedImage } = require('../utils/uploadToGCS');

exports.uploadSingleImage = (req, res) => {
  const busboy = Busboy({ headers: req.headers });
  let fileBuffer = null;
  let fileName = '';

  busboy.on('file', (fieldname, file, filename) => {
    const chunks = [];
    fileName = filename;

    file.on('data', (data) => chunks.push(data));
    file.on('end', () => {
      fileBuffer = Buffer.concat(chunks);
    });
  });

  busboy.on('finish', async () => {
    if (!fileBuffer || !fileName) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const imageUrl = await uploadCompressedImage(fileBuffer, fileName);
      return res.status(200).json({ imageUrl });
    } catch (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: 'Image upload failed' });
    }
  });

  req.pipe(busboy);
};
