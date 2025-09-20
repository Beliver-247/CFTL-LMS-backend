// routes/teacherRoutes.js
const express = require('express');
const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const { authorizeRole } = require('../middleware/authorizeRole');

const {
  createOrUpdateTeacherProfile,
  getTeacherProfile,
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  assignSubjectsToTeacher,     // NEW
  getSubjectsForTeacher        // NEW
} = require('../controllers/teacherController');

const router = express.Router();

router.post('/profile', verifyFirebaseToken, createOrUpdateTeacherProfile);
router.get('/profile', verifyFirebaseToken, getTeacherProfile);

// Keep your existing open CRUD as before (adjust if you want auth here)
router.post('/', createTeacher);
router.get('/', getAllTeachers);
router.get('/:id', getTeacherById);

// NEW: admin-only replace subject assignments
router.put('/:id/assign-subjects', verifyFirebaseToken, authorizeRole(['admin']), assignSubjectsToTeacher);

// NEW: convenience list
router.get('/:id/subjects', verifyFirebaseToken, authorizeRole(['admin','coordinator']), getSubjectsForTeacher);

router.put('/:id', updateTeacher);
router.delete('/:id', deleteTeacher);

module.exports = router;
