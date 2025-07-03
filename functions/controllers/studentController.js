const { db } = require('../config/firebase');
const Busboy = require('busboy');
const { uploadCompressedImage } = require('../utils/uploadToGCS');
const collection = db.collection('students');
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
    const busboy = Busboy({ headers: req.headers });

    let fileBuffer = null;
    let fileName = '';
    let formData = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      fileName = filename;
      const chunks = [];

      file.on('data', (data) => {
        chunks.push(data);
      });

      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on('field', (fieldname, val) => {
      formData[fieldname] = val;
    });

    busboy.on('finish', async () => {
      let body;
      try {
        body = JSON.parse(formData.data);
      } catch (err) {
        return res.status(400).send({ error: 'Invalid JSON in `data` field' });
      }

      const { nic, dob, mother, father, nominee } = body;

      // Validate NICs
      const allNICs = [
        { type: 'student', nic },
        { type: 'mother', nic: mother?.nic },
        { type: 'father', nic: father?.nic },
        { type: 'nominee', nic: nominee?.nic },
      ];
      for (const { type, nic } of allNICs) {
        if (nic && !isValidNIC(nic)) {
          return res.status(400).send({ error: `Invalid ${type} NIC format` });
        }
      }

      const profilePictureUrl = fileBuffer
        ? await uploadCompressedImage(fileBuffer, fileName)
        : null;

      // Auto-create parent accounts
      await tryCreateParent(mother?.nic, mother?.email, mother?.name);
      await tryCreateParent(father?.nic, father?.email, father?.name);
      await tryCreateParent(nominee?.nic, null, nominee?.name);

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
          registrationDate: admin.firestore.Timestamp.now(),
          registrationFee: Number(body.registrationFee),
          monthlyFee: Number(body.monthlyFee),
          preBudget: Number(body.preBudget),
          totalAmount: Number(body.totalAmount),
          dob: new Date(dob),
          profilePictureUrl,
          parents: { mother, father },
          subjects: body.subjects,
          nominee,
        };

        const newDocRef = db.collection('students').doc();
        transaction.set(newDocRef, studentData);

        return { id: newDocRef.id, registrationNo };
      });

      res.status(201).send(result);
    });

    req.pipe(busboy);
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

    res.status(200).send({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ UPDATE student by ID
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const busboy = Busboy({ headers: req.headers });

    let fileBuffer = null;
    let fileName = '';
    let formData = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      fileName = filename;
      const chunks = [];

      file.on('data', (data) => {
        chunks.push(data);
      });

      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on('field', (fieldname, val) => {
      formData[fieldname] = val;
    });

    busboy.on('finish', async () => {
      let body;
      try {
        body = formData.data ? JSON.parse(formData.data) : formData;
      } catch (err) {
        return res.status(400).send({ error: 'Invalid JSON in `data` field' });
      }

      // Validate NICs (if present)
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

      // Upload new profile picture if provided
      if (fileBuffer) {
        const profilePictureUrl = await uploadCompressedImage(fileBuffer, fileName);
        body.profilePictureUrl = profilePictureUrl;
      }

      await collection.doc(id).update(body);
      res.status(200).send({ id, ...body });
    });

    req.pipe(busboy);
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



