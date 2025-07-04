const express = require('express');
// const multer = require('multer');
const { checkInvite } = require('../controllers/adminController');
const {
  createAdmin,
  getLoggedInAdmin,
  updateAdmin,
  deleteAdmin
} = require('../controllers/adminController');

const { verifyFirebaseToken } = require('../middleware/firebaseAuth');

const router = express.Router();
// const upload = multer({ storage: multer.memoryStorage() });

// ✅ Public route to create admin
router.post('/', verifyFirebaseToken, createAdmin);

router.get('/check-invite', checkInvite);

// Get logged-in admin profile
router.get('/me', verifyFirebaseToken, getLoggedInAdmin);

// Update own profile (optional)
router.put('/me', verifyFirebaseToken, updateAdmin);

// Delete own profile (optional)
router.delete('/me', verifyFirebaseToken, deleteAdmin);

module.exports = router;
