const { db } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const { uploadCompressedImage } = require('../utils/uploadToGCS'); // include this if you're uploading images
const collection = db.collection('admins');

// ✅ Create new admin
exports.createAdmin = async (req, res) => {
  try {
    const {
      fullName,
      nameInitials,
      telephone,
      altTelephone
    } = req.body;

    const email = req.user.email;

    const existing = await collection.where('email', '==', email).limit(1).get();
    if (!existing.empty) {
      return res.status(400).send({ error: 'Admin with this email already exists' });
    }

    const profilePictureUrl = req.file
      ? await uploadCompressedImage(req.file.buffer, req.file.originalname)
      : null;

    const docRef = await collection.add({
      fullName,
      nameInitials,
      telephone,
      altTelephone: altTelephone || null,
      email,
      profilePictureUrl,
      password: '', // Google sign-ins don't use a password
      createdAt: new Date(),
    });

    res.status(201).send({ id: docRef.id });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
};

// ✅ Get current logged-in admin info
exports.getLoggedInAdmin = async (req, res) => {
  try {
    const email = req.user.email;

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
    const email = req.user.email;

    const snapshot = await collection.where('email', '==', email).limit(1).get();
    if (snapshot.empty) {
      return res.status(404).send({ error: 'Admin not found' });
    }

    const doc = snapshot.docs[0];
    const updateData = req.body;

    if (req.file) {
      const profilePictureUrl = await uploadCompressedImage(
        req.file.buffer,
        req.file.originalname
      );
      updateData.profilePictureUrl = profilePictureUrl;
    }

    await collection.doc(doc.id).update(updateData);
    res.status(200).send({ id: doc.id, ...updateData });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
};

// ✅ Delete logged-in admin
exports.deleteAdmin = async (req, res) => {
  try {
    const email = req.user.email;

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
