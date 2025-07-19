const { db } = require("../config/firebase");

const collection = db.collection("teachers");

exports.createTeacher = async (req, res) => {
  try {
    const data = req.body;

    const existingSnapshot = await collection
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
      assignedCourses: Array.isArray(data.assignedCourses)
        ? data.assignedCourses
        : [], // NEW
    };

    const docRef = await collection.add(teacherData);

    res.status(201).send({ id: docRef.id, ...teacherData });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

exports.assignCoursesToTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedCourses } = req.body;

    if (!Array.isArray(assignedCourses)) {
      return res
        .status(400)
        .json({ error: "assignedCourses must be an array" });
    }

    const teacherDoc = db.collection("teachers").doc(id);
    const teacherSnap = await teacherDoc.get();

    if (!teacherSnap.exists) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    await teacherDoc.update({
      assignedCourses,
      updatedAt: new Date(),
    });

    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can assign courses" });
    }

    res.status(200).json({ message: "Courses assigned successfully" });
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
    const snapshot = await collection.get();
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
    const doc = await collection.doc(req.params.id).get();
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

    // Only accept assignedCourses if it's an array
    if (data.assignedCourses && !Array.isArray(data.assignedCourses)) {
      return res
        .status(400)
        .send({ error: "assignedCourses must be an array of course IDs" });
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
    await collection.doc(req.params.id).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).send(err.message);
  }
};
