const express = require('express');
const {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getLatestRegistrationNo
} = require('../controllers/studentController');

const router = express.Router();

// Routes
router.get('/', getAllStudents);
router.get('/latest-regno', getLatestRegistrationNo);
router.get('/:id', getStudentById);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

module.exports = router;
