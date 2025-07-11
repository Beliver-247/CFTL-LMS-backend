// routes/uploadRoutes.js
const express = require('express');
const { getSignedUrl } = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.post('/signed-url', authenticate, getSignedUrl);

module.exports = router;
