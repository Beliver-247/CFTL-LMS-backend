const express = require('express');
const {
  createCourse,
  getAllCourses,
  enrollStudent,
  getStudentsForCoordinator,
  updateCourse,
  deleteCourse
} = require('../controllers/courseController');

const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const { authorizeRole } = require('../middleware/authorizeRole');

const router = express.Router();

// Admin or coordinator can access these
router.post('/', verifyFirebaseToken, authorizeRole(['admin']), createCourse);
router.get('/', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), getAllCourses);
router.put('/:courseId', verifyFirebaseToken, authorizeRole(['admin']), updateCourse);
router.post('/enroll', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), enrollStudent);
router.get('/coordinator/students', verifyFirebaseToken, authorizeRole(['coordinator']), getStudentsForCoordinator);
router.delete('/:courseId', verifyFirebaseToken, authorizeRole(['admin']), deleteCourse);


module.exports = router;
