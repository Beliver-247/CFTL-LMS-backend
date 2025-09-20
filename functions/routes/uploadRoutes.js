// routes/uploadRoutes.js
const express = require('express');
const { getSignedUrl, getViewUrl } = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');
const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const { authorizeRole } = require('../middleware/authorizeRole');

const router = express.Router();

router.post('/signed-url', authenticate, getSignedUrl);

// 🔐 Secure view URL generation for coordinators
router.post('/view-url', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), getViewUrl);

module.exports = router;
