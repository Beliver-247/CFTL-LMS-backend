const { db } = require('../config/firebase');
const collection = db.collection('registrationRequests');
const settingsDoc = db.collection('config').doc('startingMonths');

// Helper validation functions
const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);
const isValidPhone = (phone) => /^\d{10}$/.test(phone);
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

exports.getStartingMonths = async (_req, res) => {
  try {
    const doc = await settingsDoc.get();
    if (!doc.exists) return res.status(404).send({ error: 'Settings not found' });
    res.status(200).send(doc.data());
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

exports.setStartingMonths = async (req, res) => {
  try {
    const { months } = req.body;
    if (!Array.isArray(months) || months.length !== 2) {
      return res.status(400).send({ error: 'Exactly two starting months must be provided' });
    }
    await settingsDoc.set({ months });
    res.status(200).send({ message: 'Starting months updated', months });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};
