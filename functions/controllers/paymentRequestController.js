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

exports.getRequestsForParent = async (req, res) => {
  try {
    const parentNIC = req.user.nic;

    // Step 1: Get children of this parent
    const studentsSnap = await db.collection('students').get();
    const children = studentsSnap.docs.filter(doc => {
      const s = doc.data();
      return (
        s.parents?.mother?.nic === parentNIC ||
        s.parents?.father?.nic === parentNIC ||
        s.nominee?.nic === parentNIC
      );
    });

    if (children.length === 0) return res.status(200).json([]);

    const childIds = children.map(doc => doc.id);

    // Step 2: Get payment requests for those children
    const requestsSnap = await paymentRequests
      .where('studentId', 'in', childIds.slice(0, 10))
      .orderBy('requestedOn', 'desc')
      .get();

    const requests = requestsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Step 3: Map student names
    const studentMap = {};
    children.forEach(child => {
      const data = child.data();
      studentMap[child.id] = data.nameFull || 'Unnamed Student';
    });

    // Step 4: Fetch course names
    const courseSnap = await db.collection('courses').get();
    const courseMap = {};
    courseSnap.docs.forEach(doc => {
      courseMap[doc.id] = doc.data().name || 'Unnamed Course';
    });

    // Step 5: Enrich each request with names
const enrichedRequests = requests.map(req => ({
  ...req,
  studentName: studentMap[req.studentId] || req.studentId,
  courseName: courseMap[req.courseId] || req.courseId,
  requestedOn: req.requestedOn?.toDate?.().toISOString() || null,
}));


    res.status(200).json(enrichedRequests);
  } catch (err) {
    console.error('Error fetching parent payment requests:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getRequestsForCoordinator = async (req, res) => {
  try {
    const coordinatorEmail = req.user.email;

    // 1. Get all courses assigned to the coordinator
    const coursesSnap = await db.collection('courses')
      .where('coordinatorEmail', '==', coordinatorEmail)
      .get();

    const courseIds = coursesSnap.docs.map(doc => doc.id);
    if (courseIds.length === 0) return res.status(200).json([]);

    // 2. Get all payment requests for these courses
    const requestsSnap = await paymentRequests
      .where('courseId', 'in', courseIds.slice(0, 10)) // Firestore "in" limitation
      .orderBy('requestedOn', 'desc')
      .get();

    const requests = requestsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 3. Get student name mapping
    const studentIds = [...new Set(requests.map(r => r.studentId))];
    const studentSnaps = await Promise.all(
      studentIds.map(id => db.collection('students').doc(id).get())
    );
    const studentMap = {};
    studentSnaps.forEach(doc => {
      if (doc.exists) {
        const data = doc.data();
        studentMap[doc.id] = data.nameFull || 'Unnamed Student';
      }
    });

    // 4. Create course name mapping
    const courseMap = {};
    coursesSnap.docs.forEach(doc => {
      courseMap[doc.id] = doc.data().name || 'Unnamed Course';
    });

    // 5. Enrich requests
    const enriched = requests.map(req => ({
      ...req,
      studentName: studentMap[req.studentId] || req.studentId,
      courseName: courseMap[req.courseId] || req.courseId
    }));

    res.status(200).json(enriched);
  } catch (err) {
    console.error('Coordinator request fetch error:', err);
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
