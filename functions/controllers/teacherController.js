const { db } = require('../config/firebase');

const collection = db.collection('teachers');

exports.createTeacher = async (req, res) => {
  try {
    const data = req.body;

    // 🔍 Check for existing teacher with the same email
    const existingSnapshot = await db.collection('teachers')
      .where('email', '==', data.email)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return res.status(400).send({ error: 'Email already exists' });
    }

    const docRef = await db.collection('teachers').add(data);
    res.status(201).send({ id: docRef.id, ...data });

  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};
exports.getTeacherProfile = async (req, res) => {
  try {
    const { uid, email } = req.user;

    const doc = await db.collection('teachers').doc(uid).get();
    if (!doc.exists) {
      return res.status(404).send({ error: 'Profile not found' });
    }

    return res.status(200).send(doc.data());
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// Call this after verifying Firebase token
exports.createOrUpdateTeacherProfile = async (req, res) => {
  try {
    const { uid, email } = req.user;
    const data = req.body; // includes name, type, salary, etc.

    await db.collection('teachers').doc(uid).set({
      email,
      ...data,
    }, { merge: true });

    res.status(200).send({ message: 'Profile saved', uid });

  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};


exports.getAllTeachers = async (req, res) => {
  try {
    const snapshot = await collection.get();
    const teachers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).send(teachers);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.getTeacherById = async (req, res) => {
  try {
    const doc = await collection.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).send('Teacher not found');
    res.status(200).send({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // If email is being updated, check uniqueness
    if (data.email) {
      const existingSnapshot = await db.collection('teachers')
        .where('email', '==', data.email)
        .get();

      const emailUsedByOther = existingSnapshot.docs.find(doc => doc.id !== id);

      if (emailUsedByOther) {
        return res.status(400).send({ error: 'Email already in use by another teacher' });
      }
    }

    await db.collection('teachers').doc(id).update(data);
    res.status(200).send({ id, ...data });

  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};


exports.deleteTeacher = async (req, res) => {
  try {
    await collection.doc(req.params.id).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).send(err.message);
  }
};
