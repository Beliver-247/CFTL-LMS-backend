const express = require('express');
const multer = require('multer');
const {
  createAdmin,
  getLoggedInAdmin,
  updateAdmin,
  deleteAdmin
} = require('../controllers/adminController');

const { verifyFirebaseToken } = require('../middleware/firebaseAuth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Public route to create admin
router.post('/', verifyFirebaseToken, upload.single('profilePicture'), createAdmin); // ✅ CORRECT


// ✅ Secure routes (require valid Firebase token)

// Get logged-in admin profile
router.get('/me', verifyFirebaseToken, getLoggedInAdmin);

// Update own profile (optional)
router.put('/me', verifyFirebaseToken, upload.single('profilePicture'), updateAdmin);

// Delete own profile (optional)
router.delete('/me', verifyFirebaseToken, deleteAdmin);

module.exports = router;
