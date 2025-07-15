const { db } = require('../config/firebase');
const collection = db.collection('registrationRequests');
const settingsDoc = db.collection('config').doc('startingMonths');

// Helper validation functions
const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);
const isValidPhone = (phone) => /^\d{3}\s?\d{7}$/.test(phone);
const isValidName = (name) => name.trim().split(/\s+/).length >= 2;

exports.createRequest = async (req, res) => {
  try {
    const { name, email, phone, program, stream, year, duration, startingMonth } = req.body;

    // Validation
    if (!isValidName(name)) return res.status(400).send({ error: 'Name must include at least two words' });
    if (!isValidEmail(email)) return res.status(400).send({ error: 'Invalid email address' });
    if (!isValidPhone(phone)) return res.status(400).send({ error: 'Phone number must be exactly 10 digits' });
    if (!['OL', 'AL'].includes(program)) return res.status(400).send({ error: 'Invalid program selection' });
    if (program === 'AL' && !['Biology', 'Maths', 'Tech', 'Art', 'Commerce'].includes(stream)) {
      return res.status(400).send({ error: 'Invalid stream selection' });
    }
    if (!['6 month', '1 year'].includes(duration)) return res.status(400).send({ error: 'Invalid duration' });

    // Uniqueness check
    const existing = await collection
      .where('email', '==', email)
      .where('phone', '==', phone)
      .get();
    if (!existing.empty) {
      return res.status(400).send({ error: 'A request with this email and phone already exists' });
    }

    const newDoc = await collection.add({ name, email, phone, program, stream: program === 'AL' ? stream : null, year, duration, startingMonth, createdAt: new Date() });
    res.status(201).send({ id: newDoc.id, name });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

exports.getAllRequests = async (_req, res) => {
  try {
    const snapshot = await collection.get();
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).send(requests);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// getStartingMonths
exports.getStartingMonths = async (req, res) => {
  try {
    const doc = await db.collection('config').doc('startingMonths').get();
    if (!doc.exists) return res.status(200).json({
      OL_6month: [], OL_1year: [], AL_6month: [], AL_1year: []
    });

    res.status(200).json(doc.data());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// setStartingMonths
exports.setStartingMonths = async (req, res) => {
  try {
    const updates = req.body;

    await db.collection('config').doc('startingMonths').set(updates, { merge: true });
    res.status(200).json({ message: 'Starting months updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

