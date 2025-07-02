const { db } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const { createToken } = require('../config/jwt');

// 🔐 Parent Login
exports.loginParent = async (req, res) => {
  try {
    const { nic, password } = req.body;

    const snapshot = await db.collection('parents').where('nic', '==', nic).limit(1).get();

    if (snapshot.empty) return res.status(401).send({ error: 'Invalid NIC or password' });

    const doc = snapshot.docs[0];
    const parent = doc.data();

    if (parent.password !== password) {
      return res.status(401).send({ error: 'Invalid NIC or password' });
    }

    const token = createToken({ nic: parent.nic, role: 'parent' });

    res.status(200).send({ token });

  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};
