// controllers/teacherController.js
const { db } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");

const teacherCollection = db.collection("teachers");
const subjectCollection = db.collection("subjects");

exports.createTeacher = async (req, res) => {
  try {
    const data = req.body;

    const existingSnapshot = await teacherCollection
      .where("email", "==", data.email)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return res.status(400).send({ error: "Email already exists" });
    }

    const teacherData = {
      ...data,
      role: "teacher",
      createdAt: new Date(),
      // subjects, not courses
      assignedSubjects: Array.isArray(data.assignedSubjects)
        ? data.assignedSubjects
        : [],
    };

    const docRef = await teacherCollection.add(teacherData);
    res.status(201).send({ id: docRef.id, ...teacherData });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// Admin-only: replace all subject assignments for a teacher and sync the reverse index on subjects
exports.assignSubjectsToTeacher = async (req, res) => {
  try {
    const { id } = req.params; // teacherId
    const { assignedSubjects } = req.body;

    if (!Array.isArray(assignedSubjects)) {
      return res
        .status(400)
        .json({ error: "assignedSubjects must be an array of subject IDs" });
    }

    // Extra guard (route already protects this)
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can assign subjects" });
    }

    const teacherRef = teacherCollection.doc(id);
    const teacherSnap = await teacherRef.get();
    if (!teacherSnap.exists) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Validate subject IDs exist
    if (assignedSubjects.length) {
      const reads = await Promise.all(
        assignedSubjects.map((sid) => subjectCollection.doc(sid).get())
      );
      const anyMissing = reads.some((s) => !s.exists);
      if (anyMissing) {
        return res
          .status(400)
          .json({ error: "One or more subject IDs are invalid" });
      }
    }

    const prevAssigned = Array.isArray(teacherSnap.data().assignedSubjects)
      ? teacherSnap.data().assignedSubjects
      : [];

    const prevSet = new Set(prevAssigned);
    const nextSet = new Set(assignedSubjects);
    const toAdd = assignedSubjects.filter((x) => !prevSet.has(x));
    const toRemove = prevAssigned.filter((x) => !nextSet.has(x));

    const batch = db.batch();

    // Update teacher doc
    batch.update(teacherRef, {
      assignedSubjects,
      updatedAt: new Date(),
    });

    // Keep subjects.teacherIds in sync (denormalized reverse index)
    for (const subId of toRemove) {
      const sRef = subjectCollection.doc(subId);
      batch.set(
        sRef,
        { teacherIds: FieldValue.arrayRemove(id) },
        { merge: true }
      );
    }
    for (const subId of toAdd) {
      const sRef = subjectCollection.doc(subId);
      batch.set(
        sRef,
        { teacherIds: FieldValue.arrayUnion(id) },
        { merge: true }
      );
    }

    await batch.commit();
    res
      .status(200)
      .json({ message: "Subjects assigned successfully", assignedSubjects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTeacherProfile = async (req, res) => {
  try {
    const { email } = req.user;
    const snapshot = await db
      .collection("teachers")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).send({ error: "Profile not found" });
    }

    const doc = snapshot.docs[0];
    return res.status(200).send({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// Call this after verifying Firebase token
exports.createOrUpdateTeacherProfile = async (req, res) => {
  try {
    const { uid, email } = req.user;
    const data = req.body; // includes name, type, salary, etc.

    await db
      .collection("teachers")
      .doc(uid)
      .set(
        {
          email,
          ...data,
        },
        { merge: true }
      );

    res.status(200).send({ message: "Profile saved", uid });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

exports.getAllTeachers = async (req, res) => {
  try {
    const snapshot = await teacherCollection.get();
    const teachers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).send(teachers);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.getTeacherById = async (req, res) => {
  try {
    const doc = await teacherCollection.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).send("Teacher not found");
    res.status(200).send({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    if ("role" in data) delete data.role;

    if (data.email) {
      const existingSnapshot = await db
        .collection("teachers")
        .where("email", "==", data.email)
        .get();

      const emailUsedByOther = existingSnapshot.docs.find(
        (doc) => doc.id !== id
      );
      if (emailUsedByOther) {
        return res
          .status(400)
          .send({ error: "Email already in use by another teacher" });
      }
    }

    // Accept assignedSubjects only if it's an array
    if (
      "assignedSubjects" in data &&
      !Array.isArray(data.assignedSubjects)
    ) {
      return res.status(400).send({
        error: "assignedSubjects must be an array of subject IDs",
      });
    }

    data.updatedAt = new Date();
    await db.collection("teachers").doc(id).update(data);

    res.status(200).send({ id, ...data });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    await teacherCollection.doc(req.params.id).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// Convenience – list subjects for a teacher
exports.getSubjectsForTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const tSnap = await teacherCollection.doc(id).get();
    if (!tSnap.exists)
      return res.status(404).send({ error: "Teacher not found" });

    const subjectIds = Array.isArray(tSnap.data().assignedSubjects)
      ? tSnap.data().assignedSubjects
      : [];
    if (!subjectIds.length) return res.status(200).send([]);

    const reads = await Promise.all(
      subjectIds.map((sid) => subjectCollection.doc(sid).get())
    );
    const subjects = reads
      .filter((s) => s.exists)
      .map((s) => ({ id: s.id, ...s.data() }));
    res.status(200).send(subjects);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};
