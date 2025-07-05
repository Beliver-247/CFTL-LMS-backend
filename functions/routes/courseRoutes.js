const express = require('express');
const {
  createCourse,
  getAllCourses,
  enrollStudent,
  getStudentsForCoordinator
} = require('../controllers/courseController');

const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const { authorizeRole } = require('../middleware/authorizeRole');

const router = express.Router();

// Admin or coordinator can access these
router.post('/', verifyFirebaseToken, authorizeRole(['admin']), createCourse);
router.get('/', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), getAllCourses);
router.post('/enroll', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), enrollStudent);
router.get('/coordinator/students', verifyFirebaseToken, authorizeRole(['coordinator']), getStudentsForCoordinator);

module.exports = router;
