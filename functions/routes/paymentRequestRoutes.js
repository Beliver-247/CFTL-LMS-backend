// routes/paymentRequestRoutes.js
const express = require('express');
const {
  createRequest,
  getAllRequests,
  approveRequest,
  getRequestsForParent,
  getRequestsForCoordinator,
  rejectRequest
} = require('../controllers/paymentRequestController');

const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const { authorizeRole } = require('../middleware/authorizeRole');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/',
  authenticate, 
  createRequest
);

router.get('/', verifyFirebaseToken, authorizeRole(['coordinator','admin']), getAllRequests);
router.put('/:id/approve', verifyFirebaseToken, authorizeRole(['coordinator','admin']), approveRequest);
router.put('/:id/reject', verifyFirebaseToken, authorizeRole(['coordinator','admin']), rejectRequest);
router.get('/parent', authenticate, getRequestsForParent);
router.get('/coordinator', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), getRequestsForCoordinator);


module.exports = router;
