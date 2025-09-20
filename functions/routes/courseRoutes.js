// courseRoutes.js
const express = require('express');
const {
  createCourse,
  getAllCourses,
  updateCourse,
  deleteCourse,
  getCoursesForCoordinator
} = require('../controllers/courseController');

const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const { authorizeRole } = require('../middleware/authorizeRole');

const router = express.Router();

// ✅ Admin can create courses
router.post('/', verifyFirebaseToken, authorizeRole(['admin']), createCourse);

// ✅ Admin & coordinators can view courses
router.get('/', getAllCourses);

// ✅ Admin can update a course
router.put('/:courseId', verifyFirebaseToken, authorizeRole(['admin']), updateCourse);

// ✅ Admin & coordinators can get courses for a coordinator
router.get('/coordinator/courses', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), getCoursesForCoordinator);

// ✅ Admin can delete a course
router.delete('/:courseId', verifyFirebaseToken, authorizeRole(['admin']), deleteCourse);

module.exports = router;
