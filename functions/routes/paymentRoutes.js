const express = require('express');
const {
  createPayment,
  getAllPayments,
  getPaymentById,
  getPaymentsByStudent,
  updatePayment,
  deletePayment,
  getPaymentsForParent
} = require('../controllers/paymentController');

const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const { authorizeRole } = require('../middleware/authorizeRole');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), createPayment);
router.get('/parent/children', authenticate, getPaymentsForParent);
router.get('/', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), getAllPayments);
router.get('/:id', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), getPaymentById);
router.get('/student/:studentId', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), getPaymentsByStudent);
router.put('/:id', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), updatePayment);
router.delete('/:id', verifyFirebaseToken, authorizeRole(['admin', 'coordinator']), deletePayment);

module.exports = router;
