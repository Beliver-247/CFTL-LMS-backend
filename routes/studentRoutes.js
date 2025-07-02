const express = require('express');
const multer = require('multer');
const { 
  createStudent, 
  getAllStudents, 
  getStudentById, 
  updateStudent, 
  deleteStudent,
  getLatestRegistrationNo 
} = require('../controllers/studentController'); // Import all required functions

const router = express.Router();

// Use memory storage for in-memory buffer access (for sharp compression)
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getAllStudents);
router.get('/latest-regno', getLatestRegistrationNo);
router.get('/:id', getStudentById);
router.post('/', upload.single('profilePicture'), createStudent);
router.put('/:id', upload.single('profilePicture'), updateStudent); // Add route for update
router.delete('/:id', deleteStudent);


module.exports = router;