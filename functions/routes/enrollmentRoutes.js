const express = require('express');
const {
  enrollStudent,
  getEnrollmentsByCourse,
  deleteEnrollment
} = require('../controllers/enrollmentController');

const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const { authorizeRole } = require('../middleware/authorizeRole');

const router = express.Router();

router.post('/', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), enrollStudent);
router.get('/course/:courseId', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), getEnrollmentsByCourse);
router.delete('/:id', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), deleteEnrollment);

module.exports = router;
