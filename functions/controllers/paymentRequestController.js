// controllers/paymentRequestController.js
const { db } = require('../config/firebase');
const { Timestamp } = require('firebase-admin/firestore');
const paymentRequests = db.collection('paymentRequests');
const payments = db.collection('payments');

exports.createRequest = async (req, res) => {
  try {
    const {
      paymentId,
      studentId,
      courseId,
      month,
      amountRequested,
      remainingAmount,
      receiptUrl,
      paymentDate,
    } = req.body;

    if (!paymentId || !studentId || !courseId || !month || !receiptUrl || !amountRequested) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Ensure one request per payment
    const existing = await paymentRequests.where('paymentId', '==', paymentId).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Request already exists for this payment' });
    }

    const newDoc = await paymentRequests.add({
      paymentId,
      studentId,
      courseId,
      month,
      amountRequested,
      remainingAmount,
      receiptUrl,
      paymentDate,
      requestedOn: Timestamp.now(),
      status: 'pending',
      approvedBy: null,
      approvedOn: null,
    });

    res.status(201).json({ id: newDoc.id });
  } catch (err) {
    console.error('Create request error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    const snapshot = await paymentRequests.orderBy('requestedOn', 'desc').get();
    const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const email = req.user.email;

    const reqDoc = await paymentRequests.doc(id).get();
    if (!reqDoc.exists) return res.status(404).json({ error: 'Request not found' });

    const requestData = reqDoc.data();
    if (requestData.status !== 'pending') {
      return res.status(400).json({ error: 'Already processed' });
    }

    // Update payment record
    const paymentRef = payments.doc(requestData.paymentId);
    const paymentDoc = await paymentRef.get();

    if (!paymentDoc.exists) return res.status(404).json({ error: 'Payment not found' });

    const paymentData = paymentDoc.data();
    const totalPaid = Number(paymentData.amountPaid || 0) + Number(requestData.amountRequested);
    const amountDue = Number(paymentData.amountDue || 0);
    const status =
      totalPaid === 0 ? 'Unpaid' :
      totalPaid < amountDue ? 'Incomplete' :
      'Paid';

    await paymentRef.update({
      amountPaid: totalPaid,
      remainingAmount: Math.max(amountDue - totalPaid, 0),
      paidOn: Timestamp.now(),
      status,
    });

    await paymentRequests.doc(id).update({
      status: 'approved',
      approvedBy: email,
      approvedOn: Timestamp.now(),
    });

    res.status(200).json({ message: 'Request approved and payment updated' });
  } catch (err) {
    console.error('Approval error:', err);
    res.status(500).json({ error: err.message });
  }
};
