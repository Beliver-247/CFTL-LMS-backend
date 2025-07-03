const express = require('express');
const router = express.Router();
const { uploadSingleImage } = require('../controllers/imageUploadController');

router.post('/', uploadSingleImage);

module.exports = router;
