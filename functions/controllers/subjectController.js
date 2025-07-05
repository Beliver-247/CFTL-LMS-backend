const { db } = require('../config/firebase');
const { Timestamp } = require('firebase-admin/firestore');

const subjectCollection = db.collection('subjects');
const validPrograms = ['OL', 'AL'];
const validStreams = ['biology', 'maths', 'tech', 'art', 'commerce'];

// ✅ Create a new subject
exports.createSubject = async (req, res) => {
  try {
    const { subjectName, program, stream } = req.body;

    if (!subjectName || typeof subjectName !== 'string') {
      return res.status(400).send({ error: 'subjectName is required and must be a string' });
    }

    if (!program || typeof program !== 'string' || !validPrograms.includes(program.toUpperCase())) {
      return res.status(400).send({ error: 'program is required and must be either "OL" or "AL"' });
    }

    const subjectData = {
      subjectName,
      program: program.toUpperCase(),
      createdAt: Timestamp.now(),
    };

    if (program.toUpperCase() === 'AL') {
      if (!stream || typeof stream !== 'string' || !validStreams.includes(stream.toLowerCase())) {
        return res.status(400).send({ error: 'stream is required for AL program and must be valid' });
      }
      subjectData.stream = stream.toLowerCase();
    } else if (stream) {
      return res.status(400).send({ error: 'OL program should not have a stream' });
    }

    const newDoc = await subjectCollection.add(subjectData);
    res.status(201).send({ id: newDoc.id });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Get all subjects
exports.getAllSubjects = async (req, res) => {
  try {
    const { program, stream } = req.query;

    if (!program || !validPrograms.includes(program.toUpperCase())) {
      return res.status(400).send({ error: 'program is required and must be "OL" or "AL"' });
    }

    let query = subjectCollection.where('program', '==', program.toUpperCase());

    if (program.toUpperCase() === 'AL') {
      if (!stream || !validStreams.includes(stream.toLowerCase())) {
        return res.status(400).send({ error: 'Valid stream is required for AL program' });
      }
      query = query.where('stream', '==', stream.toLowerCase());
    }

    const snapshot = await query.get();
    const subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).send(subjects);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Update a subject
exports.updateSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const updateData = req.body;

    if ('subjectName' in updateData && typeof updateData.subjectName !== 'string') {
      return res.status(400).send({ error: 'subjectName must be a string' });
    }

    if ('program' in updateData && (!validPrograms.includes(updateData.program.toUpperCase()))) {
      return res.status(400).send({ error: 'program must be "OL" or "AL"' });
    }

    if ('stream' in updateData && typeof updateData.stream !== 'string') {
      return res.status(400).send({ error: 'stream must be a string' });
    }

    const subjectRef = subjectCollection.doc(subjectId);
    const doc = await subjectRef.get();

    if (!doc.exists) {
      return res.status(404).send({ error: 'Subject not found' });
    }

    const existingData = doc.data();
    const newProgram = updateData.program ? updateData.program.toUpperCase() : existingData.program;

    if (newProgram === 'OL' && 'stream' in updateData) {
      return res.status(400).send({ error: 'OL program should not have a stream' });
    }

    if (newProgram === 'AL' && 'stream' in updateData && !validStreams.includes(updateData.stream.toLowerCase())) {
      return res.status(400).send({ error: 'Invalid stream for AL program' });
    }

    await subjectRef.update(updateData);
    res.status(200).send({ success: true });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Get all subjects (no filters)
exports.getAllSubjectsRaw = async (req, res) => {
  try {
    const snapshot = await subjectCollection.get();
    const subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).send(subjects);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Get a single subject by ID
exports.getSubjectById = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const doc = await subjectCollection.doc(subjectId).get();

    if (!doc.exists) {
      return res.status(404).send({ error: 'Subject not found' });
    }

    res.status(200).send({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};



// ✅ Delete a subject
exports.deleteSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    const subjectRef = subjectCollection.doc(subjectId);
    const doc = await subjectRef.get();

    if (!doc.exists) {
      return res.status(404).send({ error: 'Subject not found' });
    }

    await subjectRef.delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};
