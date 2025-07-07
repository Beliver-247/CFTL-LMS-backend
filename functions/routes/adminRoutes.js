const express = require('express');
const { authorizeRole } = require('../middleware/authorizeRole');
const { checkInvite } = require('../controllers/adminController');
const {
  createAdmin,
  getLoggedInAdmin,
  updateAdmin,
  deleteAdmin,
  getAllAdmins,
  updateAdminById
} = require('../controllers/adminController');

const { verifyFirebaseToken } = require('../middleware/firebaseAuth');

const router = express.Router();

// ✅ Public route to create admin
router.post('/', verifyFirebaseToken, createAdmin);

router.get('/check-invite', checkInvite);

// Get logged-in admin profile
router.get('/me', verifyFirebaseToken, getLoggedInAdmin);

// Update own profile (optional)
router.put('/me', verifyFirebaseToken, updateAdmin);

router.get('/all', verifyFirebaseToken, authorizeRole(['admin']), getAllAdmins);
router.put('/:id', verifyFirebaseToken, authorizeRole(['admin']), updateAdminById);

// Delete own profile (optional)
router.delete('/me', verifyFirebaseToken, deleteAdmin);

module.exports = router;
