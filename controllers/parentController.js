const { db } = require('../config/firebase');

const collection = db.collection('parents');

// NIC format validation
function isValidNIC(nic) {
  const nic12 = /^\d{12}$/;
  const nicOld = /^\d{9}[vV]$/;
  return nic12.test(nic) || nicOld.test(nic);
}

exports.createParent = async (req, res) => {
  try {
    const { name, nic, password } = req.body;

    if (!isValidNIC(nic)) {
      return res.status(400).send({ error: 'Invalid NIC format' });
    }

    // Unique NIC check
    const existing = await collection.where('nic', '==', nic).limit(1).get();
    if (!existing.empty) {
      return res.status(400).send({ error: 'NIC already exists' });
    }

    const newDoc = await collection.add({ name, nic, password });
    res.status(201).send({ id: newDoc.id, name, nic });

  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

exports.getAllParents = async (req, res) => {
  try {
    const snapshot = await collection.get();
    const parents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).send(parents);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};
exports.getChildrenByParentNic = async (req, res) => {
  try {
    const nic = req.user.nic; // from JWT

    const studentsRef = db.collection('students');
    const matching = [];

    const snapshot = await studentsRef.get();
    snapshot.forEach(doc => {
      const s = doc.data();
      if (
        s.parents?.mother?.nic === nic ||
        s.parents?.father?.nic === nic ||
        s.nominee?.nic === nic
      ) {
        matching.push({ id: doc.id, ...s });
      }
    });

    res.status(200).send(matching);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};


exports.getParentById = async (req, res) => {
  try {
    const doc = await collection.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).send({ error: 'Parent not found' });
    res.status(200).send({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

exports.updateParent = async (req, res) => {
  try {
    const { id } = req.params;
    const { nic } = req.body;

    if (nic && !isValidNIC(nic)) {
      return res.status(400).send({ error: 'Invalid NIC format' });
    }

    if (nic) {
      const snapshot = await collection.where('nic', '==', nic).get();
      const nicUsedByOther = snapshot.docs.find(doc => doc.id !== id);
      if (nicUsedByOther) {
        return res.status(400).send({ error: 'NIC already in use by another parent' });
      }
    }

    await collection.doc(id).update(req.body);
    res.status(200).send({ id, ...req.body });

  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

exports.deleteParent = async (req, res) => {
  try {
    await collection.doc(req.params.id).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};
