const express = require('express');
const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const { createOrUpdateTeacherProfile,getTeacherProfile } = require('../controllers/teacherController');
const {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
} = require('../controllers/teacherController');

const router = express.Router();

router.post('/profile', verifyFirebaseToken, createOrUpdateTeacherProfile);
router.get('/profile', verifyFirebaseToken, getTeacherProfile);
router.post('/', createTeacher);
router.get('/', getAllTeachers);
router.get('/:id', getTeacherById);
router.put('/:id', updateTeacher);
router.delete('/:id', deleteTeacher);

module.exports = router;
