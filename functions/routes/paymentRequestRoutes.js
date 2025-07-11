// routes/paymentRequestRoutes.js
const express = require('express');
const {
  createRequest,
  getAllRequests,
  approveRequest,
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

router.get('/', verifyFirebaseToken, authorizeRole(['coordinator']), getAllRequests);
router.put('/:id/approve', verifyFirebaseToken, authorizeRole(['coordinator']), approveRequest);

module.exports = router;
