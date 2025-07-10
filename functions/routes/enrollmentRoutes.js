const express = require('express');
const {
  enrollStudent,
  getEnrollmentsByCourse,
  deleteEnrollment,
  getEnrollmentsForCoordinator,
  getAllStudentsWithOptionalEnrollment,
  updateEnrollmentStatus
} = require('../controllers/enrollmentController');

const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const { authorizeRole } = require('../middleware/authorizeRole');

const router = express.Router();

router.post('/', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), enrollStudent);
router.get('/course/:courseId', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), getEnrollmentsByCourse);
router.delete('/:id', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), deleteEnrollment);
router.get(
  "/all",
  verifyFirebaseToken,
  authorizeRole(["admin"]),
  getAllStudentsWithOptionalEnrollment
);
router.patch('/:id/status', verifyFirebaseToken, authorizeRole(['coordinator']), updateEnrollmentStatus);
router.get(
  '/coordinator',
  verifyFirebaseToken,
  authorizeRole(['coordinator']),
  getEnrollmentsForCoordinator
);

module.exports = router;
