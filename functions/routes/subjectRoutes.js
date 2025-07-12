const express = require('express');
const {
  createSubject,
  getAllSubjects,
  getAllSubjectsRaw,
  getSubjectById,
  updateSubject,
  deleteSubject,
} = require('../controllers/subjectController');

const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const { authorizeRole } = require('../middleware/authorizeRole');

const router = express.Router();

// Only admins can create, update, delete subjects
router.post('/', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), createSubject);
router.put('/:subjectId', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), updateSubject);
router.delete('/:subjectId', verifyFirebaseToken, authorizeRole(['admin','coordinator']), deleteSubject);

// Admins and coordinators can read subjects
router.get('/', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), getAllSubjects);
router.get('/all', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), getAllSubjectsRaw);
router.get('/:subjectId', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), getSubjectById);

module.exports = router;
