const db = require("../config/firebase");

exports.createSyllabus = async (req, res) => {
  try {
    const docRef = await db.collection("syllabus").add(req.body);
    res.status(201).json({ id: docRef.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllSyllabus = async (req, res) => {
  try {
    const snapshot = await db.collection("syllabus").get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSyllabus = async (req, res) => {
  try {
    await db.collection("syllabus").doc(req.params.id).update(req.body);
    res.status(200).json({ message: "Updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteSyllabus = async (req, res) => {
  try {
    await db.collection("syllabus").doc(req.params.id).delete();
    res.status(200).json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
