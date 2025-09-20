// routes/subjectRoutes.js
const express = require('express');
const {
  createSubject,
  getAllSubjects,
  getAllSubjectsRaw,
  getSubjectById,
  updateSubject,
  deleteSubject,
  getPublicSubjectNames,
  getTeachersForSubject        // NEW
} = require('../controllers/subjectController');

const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const { authorizeRole } = require('../middleware/authorizeRole');

const router = express.Router();

router.get('/public', getPublicSubjectNames);

// Only admins & coordinators can create/update/delete/read protected subject info
router.post('/', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), createSubject);
router.put('/:subjectId', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), updateSubject);
router.delete('/:subjectId', verifyFirebaseToken, authorizeRole(['admin','coordinator']), deleteSubject);

router.get('/', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), getAllSubjects);
router.get('/all', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), getAllSubjectsRaw);
router.get('/:subjectId', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), getSubjectById);

// NEW: who teaches this subject?
router.get('/:subjectId/teachers', verifyFirebaseToken, authorizeRole(['admin','coordinator']), getTeachersForSubject);

module.exports = router;
