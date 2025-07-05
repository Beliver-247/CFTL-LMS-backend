const { db } = require('../config/firebase');
const collection = db.collection('students');
const {Timestamp} = require('firebase-admin/firestore');
const admin = require('firebase-admin');

const isValidNIC = (nic) => {
  const nic12 = /^\d{12}$/;
  const nicOld = /^\d{9}[vV]$/;
  return nic12.test(nic) || nicOld.test(nic);
};

// Helper to auto-create parent if not exists
const tryCreateParent = async (nic, email, name) => {
  if (!nic || !isValidNIC(nic)) return;

  const parentRef = db.collection('parents');
  const existing = await parentRef.where('nic', '==', nic).limit(1).get();

  if (existing.empty) {
    await parentRef.add({
      nic,
      password: nic, // default password
      email: email || null,
      name: name || 'Unknown',
    });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const body = req.body;
    const { nic, dob, mother, father, nominee } = body;

    // Validate NIC formats
    if (nic && !isValidNIC(nic)) return res.status(400).send({ error: 'Invalid student NIC format' });
    if (mother?.nic && !isValidNIC(mother.nic)) return res.status(400).send({ error: 'Invalid mother NIC format' });
    if (father?.nic && !isValidNIC(father.nic)) return res.status(400).send({ error: 'Invalid father NIC format' });
    if (nominee?.nic && !isValidNIC(nominee.nic)) return res.status(400).send({ error: 'Invalid nominee NIC format' });

    // Auto-create parent accounts
    await tryCreateParent(mother?.nic, mother?.email, mother?.name);
    await tryCreateParent(father?.nic, father?.email, father?.name);
    await tryCreateParent(nominee?.nic, null, nominee?.name);

    // Transaction to generate registration number and add student
    const result = await db.runTransaction(async (transaction) => {
      const counterRef = db.collection('counters').doc('student');
      const counterDoc = await transaction.get(counterRef);

      if (!counterDoc.exists) {
        throw new Error('Student counter not initialized.');
      }

      const lastReg = counterDoc.data().lastRegNumber || 0;
      const nextReg = lastReg + 1;
      const registrationNo = `STD${String(nextReg).padStart(4, '0')}`;

      transaction.update(counterRef, { lastRegNumber: nextReg });

      const studentData = {
        ...body,
        registrationNo,
        registrationDate: Timestamp.now(),
        registrationFee: Number(body.registrationFee),
        monthlyFee: Number(body.monthlyFee),
        preBudget: Number(body.preBudget),
        totalAmount: Number(body.totalAmount),
        dob: new Date(dob),
        parents: { mother, father },
        subjects: body.subjects,
        nominee,
      };

      const newDocRef = db.collection('students').doc();
      transaction.set(newDocRef, studentData);

      return { id: newDocRef.id, registrationNo, registrationDate: new Date() };
    });

    res.status(201).send(result);
  } catch (err) {
    console.error("CreateStudent error:", err);
    res.status(500).send({ error: err.message });
  }
};


// ✅ GET all students
exports.getAllStudents = async (req, res) => {
  try {
    const snapshot = await collection.get();
    const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).send(students);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ GET student by ID
exports.getStudentById = async (req, res) => {
  try {
    const doc = await collection.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).send({ error: 'Student not found' });

    const student = { id: doc.id, ...doc.data() };

    if (student.enrolledCourse?.id) {
      const courseDoc = await db.collection('courses').doc(student.enrolledCourse.id).get();
      if (courseDoc.exists) {
        student.enrolledCourse.details = courseDoc.data();
      }
    }

    res.status(200).send(student);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};


exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const nicChecks = [
      { field: 'nic', value: body.nic },
      { field: 'mother.nic', value: body?.mother?.nic },
      { field: 'father.nic', value: body?.father?.nic },
      { field: 'nominee.nic', value: body?.nominee?.nic },
    ];

    for (const { field, value } of nicChecks) {
      if (value && !isValidNIC(value)) {
        return res.status(400).send({ error: `Invalid NIC format in ${field}` });
      }
    }

    await collection.doc(id).update(body);
    res.status(200).send({ id, ...body });
  } catch (err) {
    console.error("UpdateStudent error:", err);
    res.status(500).send({ error: err.message });
  }
};


// ✅ DELETE student by ID
exports.deleteStudent = async (req, res) => {
  try {
    await collection.doc(req.params.id).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ GET latest registration number
exports.getLatestRegistrationNo = async (req, res) => {
  try {
    const counterDoc = await db.collection('counters').doc('student').get();

    if (!counterDoc.exists) {
      return res.status(200).send({ registrationNo: null });
    }

    const { lastRegNumber } = counterDoc.data();
    const latestRegNo = lastRegNumber > 0
      ? `STD${String(lastRegNumber).padStart(4, '0')}`
      : null;

    res.status(200).send({ registrationNo: latestRegNo });
  } catch (err) {
    console.error('Error fetching latest registration number:', err);
    res.status(500).send({ error: err.message });
  }
};
