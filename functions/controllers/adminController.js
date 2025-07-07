const { db } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const collection = db.collection('admins');
const inviteCollection = db.collection('admin_invites');

// ✅ Create new admin
exports.createAdmin = async (req, res) => {
  try {
const {
  fullName,
  nameInitials,
  telephone,
  altTelephone,
  role 
} = req.body;

    const email = req.user.email.toLowerCase();

    // ✅ REQUIRED FIELD CHECK - ADD THIS HERE
    if (!fullName || !nameInitials || !telephone || !email) {
      return res.status(400).send({ error: 'Full name, name with initials, telephone, and email are required' });
    }

    // Check if admin already exists
    const existing = await collection.where('email', '==', email).limit(1).get();
    if (!existing.empty) {
      return res.status(400).send({ error: 'Admin with this email already exists' });
    }

    // ✅ You no longer handle profile picture
const docRef = await collection.add({
  fullName,
  nameInitials,
  telephone,
  altTelephone: altTelephone || null,
  email,
  password: '', 
  role: role || 'admin', 
  createdAt: new Date(),
});


    res.status(201).send({ id: docRef.id });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
};

exports.checkInvite = async (req, res) => {
  try {
    const email = req.query.email?.toLowerCase();
    if (!email) return res.status(400).send({ error: 'Email is required' });

    const invite = await inviteCollection.where('email', '==', email).limit(1).get();
    if (invite.empty) {
      return res.status(403).send({ error: 'Not invited' });
    }

    res.status(200).send({ invited: true });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};


// ✅ Get current logged-in admin info
exports.getLoggedInAdmin = async (req, res) => {
  try {
    const email = req.user.email.toLowerCase();

    const snapshot = await collection.where('email', '==', email).limit(1).get();
    if (snapshot.empty) {
      return res.status(404).send({ error: 'Admin not found' });
    }

    const doc = snapshot.docs[0];
    res.status(200).send({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
};

// ✅ Update logged-in admin
exports.updateAdmin = async (req, res) => {
  try {
    const email = req.user.email.toLowerCase();

    const snapshot = await collection.where('email', '==', email).limit(1).get();
    if (snapshot.empty) {
      return res.status(404).send({ error: 'Admin not found' });
    }

    const doc = snapshot.docs[0];
    const updateData = req.body;

    await collection.doc(doc.id).update(updateData);
    res.status(200).send({ id: doc.id, ...updateData });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
};

exports.getAllAdmins = async (req, res) => {
  try {
    const snapshot = await collection.get();
    const admins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).send(admins);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

exports.updateAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    await collection.doc(id).update(req.body);
    res.status(200).send({ message: 'Updated successfully' });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};


// ✅ Delete logged-in admin
exports.deleteAdmin = async (req, res) => {
  try {
    const email = req.user.email.toLowerCase();

    const snapshot = await collection.where('email', '==', email).limit(1).get();
    if (snapshot.empty) {
      return res.status(404).send({ error: 'Admin not found' });
    }

    const docId = snapshot.docs[0].id;
    await collection.doc(docId).delete();

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
};
