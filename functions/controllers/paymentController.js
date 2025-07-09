const { db } = require('../config/firebase');
const { Timestamp } = require('firebase-admin/firestore');

const paymentCollection = db.collection('payments');
const studentCollection = db.collection('students');

// ✅ Create payment entry
exports.createPayment = async (req, res) => {
  try {
    const {
      studentId,
      courseId,
      month,
      amountDue,
      amountPaid = 0,
      paidOn,
      paymentMethod,
      transactionId,
    } = req.body;

    if (!studentId || !courseId || !month || !amountDue) {
      return res.status(400).send({ error: "Required fields are missing" });
    }

const cappedPaid = Math.min(Number(amountPaid), Number(amountDue));
const remainingAmount = Math.max(Number(amountDue) - cappedPaid, 0);

const status =
  cappedPaid === 0
    ? "Unpaid"
    : cappedPaid < amountDue
    ? "Incomplete"
    : "Paid";

const newDoc = await paymentCollection.add({
  studentId,
  courseId,
  month,
  amountDue,
  amountPaid: cappedPaid,
  remainingAmount,
  status,
  paidOn: paidOn ? Timestamp.fromDate(new Date(paidOn)) : null,
  paymentMethod: paymentMethod || null,
  transactionId: transactionId || null,
  createdAt: Timestamp.now(),
});


    res.status(201).send({ id: newDoc.id });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// 🔍 Get payments for all children of the logged-in parent
exports.getPaymentsForParent = async (req, res) => {
  try {
    const nic = req.user.nic; // extracted from JWT

    // Step 1: Get all children of the parent
    const studentsSnap = await db.collection('students').get();
    const children = studentsSnap.docs
      .filter(doc => {
        const s = doc.data();
        return (
          s.parents?.mother?.nic === nic ||
          s.parents?.father?.nic === nic ||
          s.nominee?.nic === nic
        );
      })
      .map(doc => ({ id: doc.id, ...doc.data() }));

    if (children.length === 0) return res.status(200).send([]);

    // Step 2: Get payments for all those students
    const studentIds = children.map(child => child.id);
    const paymentsSnap = await db.collection('payments')
      .where('studentId', 'in', studentIds.slice(0, 10)) // Firestore limits 'in' queries to 10
      .get();

    const payments = paymentsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        remainingAmount: Math.max(data.amountDue - data.amountPaid, 0),
        paidOn: data.paidOn ? data.paidOn.toDate().toISOString().split("T")[0] : null,
        createdAt: data.createdAt?.toDate().toISOString(),
      };
    });

    res.status(200).send(payments);
  } catch (err) {
    console.error("Error fetching parent payments:", err);
    res.status(500).send({ error: err.message });
  }
};


// ✅ Get all payment records
exports.getAllPayments = async (req, res) => {
  try {
    const snapshot = await paymentCollection.get();
    const payments = snapshot.docs.map(doc => {
  const data = doc.data();
  const amountDue = Number(data.amountDue || 0);
  const amountPaid = Number(data.amountPaid || 0);
  const remainingAmount = Math.max(amountDue - amountPaid, 0);

  return {
    id: doc.id,
    ...data,
    remainingAmount
  };
});

    res.status(200).send(payments);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Get payment by ID
exports.getPaymentById = async (req, res) => {
  try {
    const doc = await paymentCollection.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).send({ error: 'Payment not found' });
    res.status(200).send({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Get payments for a specific student
exports.getPaymentsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const paymentsSnap = await paymentCollection
      .where('studentId', '==', studentId)
      .get();

const payments = paymentsSnap.docs.map(doc => {
  const data = doc.data();

  const amountDue = Number(data.amountDue || 0);
  const amountPaid = Number(data.amountPaid || 0);
  const remainingAmount = Math.max(amountDue - amountPaid, 0);

  return {
    id: doc.id,
    ...data,
    remainingAmount,
    paidOn: data.paidOn ? data.paidOn.toDate().toISOString().split("T")[0] : null,
    createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null
  };
});


    res.status(200).send(payments);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Update a payment record (e.g., mark as paid)
exports.updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const docRef = paymentCollection.doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) return res.status(404).send({ error: "Payment not found" });

    const existingData = docSnap.data();

    const amountDue = updateData.amountDue !== undefined
  ? Number(updateData.amountDue)
  : existingData.amountDue;

const amountPaid = updateData.amountPaid !== undefined
  ? Math.min(Number(updateData.amountPaid), amountDue)
  : existingData.amountPaid;

const remainingAmount = Math.max(amountDue - amountPaid, 0);

const status =
  amountPaid === 0
    ? "Unpaid"
    : amountPaid < amountDue
    ? "Incomplete"
    : "Paid";

const newData = {
  ...updateData,
  amountPaid,
  amountDue,
  remainingAmount,
  status,
};

if (newData.paidOn) {
  newData.paidOn = Timestamp.fromDate(new Date(newData.paidOn));
}


    await docRef.update(newData);

    res.status(200).send({ success: true });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Delete a payment
exports.deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    await paymentCollection.doc(id).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};
