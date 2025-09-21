// controllers/syllabusController.js
// Subject-based syllabus controller (no courseId anywhere)

const { db } = require("../config/firebase");

/** =========================
 *  Validation
 *  ========================= */
const validateSyllabusStructure = (syllabus) => {
  if (!syllabus || typeof syllabus !== "object") {
    return { valid: false, message: "Invalid payload" };
  }
  const { subjectId, month, weeks } = syllabus;

  if (!subjectId || typeof subjectId !== "string") {
    return { valid: false, message: "Missing or invalid subjectId" };
  }
  if (!month || typeof month !== "string") {
    // e.g., "2025-09" — use whatever format you prefer, just be consistent
    return { valid: false, message: "Missing or invalid month" };
  }
  if (!Array.isArray(weeks)) {
    return { valid: false, message: "weeks must be an array" };
  }

  for (const w of weeks) {
    if (typeof w.weekNumber !== "number") {
      return { valid: false, message: "week.weekNumber must be a number" };
    }
    if (!Array.isArray(w.topics)) {
      return { valid: false, message: "week.topics must be an array" };
    }
    for (const t of w.topics) {
      if (typeof t.title !== "string") {
        return { valid: false, message: "topic.title must be a string" };
      }
      if (typeof t.status !== "string") {
        return { valid: false, message: "topic.status must be a string" };
      }
      if (!Array.isArray(t.subtopics)) {
        return { valid: false, message: "topic.subtopics must be an array" };
      }
      for (const s of t.subtopics) {
        if (typeof s.title !== "string") {
          return { valid: false, message: "subtopic.title must be a string" };
        }
        if (typeof s.status !== "string") {
          return { valid: false, message: "subtopic.status must be a string" };
        }
      }
    }
  }
  return { valid: true };
};

/** Optional existence check for the subject */
const assertSubjectExists = async (subjectId) => {
  const ref = db.collection("subjects").doc(subjectId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err = new Error("Subject not found");
    err.status = 400;
    throw err;
  }
};

/** Build deterministic syllabus doc id */
const syllabusDocId = (subjectId, month) => `${subjectId}_${month}`;

/** =========================
 *  Create / Upsert
 *  ========================= */
exports.createSyllabus = async (req, res) => {
  try {
    const payload = req.body;
    const { valid, message } = validateSyllabusStructure(payload);
    if (!valid) return res.status(400).json({ error: message });

    const { subjectId, month } = payload;

    // Optional but safer
    await assertSubjectExists(subjectId);

    const id = syllabusDocId(subjectId, month);
    const ref = db.collection("syllabus").doc(id);

    const now = new Date().toISOString();
    const createdBy = req.user?.email || "system";

    await ref.set(
      {
        ...payload,
        createdBy,
        updatedAt: now,
      },
      { merge: true } // upsert
    );

    return res.status(201).json({ id, message: "Syllabus saved." });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message });
  }
};

/** =========================
 *  Get by Subject + Month
 *  ========================= */
exports.getSyllabusBySubjectAndMonth = async (req, res) => {
  try {
    const { subjectId, month } = req.params;

    if (!subjectId || !month) {
      return res.status(400).json({ error: "subjectId and month are required" });
    }

    const id = syllabusDocId(subjectId, month);
    const doc = await db.collection("syllabus").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "No syllabus found" });
    }
    return res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

/** =========================
 *  List all (admin-only)
 *  ========================= */
exports.getAllSyllabus = async (req, res) => {
  try {
    // Optionally require coordinator/admin
    const role = req.user?.role;
    if (role !== "coordinator" && role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const snap = await db.collection("syllabus").get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

/** =========================
 *  Update by document id
 *  ========================= */
exports.updateSyllabus = async (req, res) => {
  try {
    const { id } = req.params;
    const patch = { ...(req.body || {}) };

    // ✅ Ignore identity fields instead of throwing
    delete patch.subjectId;
    delete patch.month;

    const ref = db.collection("syllabus").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });

    await ref.set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
    return res.json({ message: "Syllabus updated" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};


/** =========================
 *  Delete by document id
 *  ========================= */
exports.deleteSyllabus = async (req, res) => {
  try {
    const { id } = req.params;

    const role = req.user?.role;
    if (role !== "coordinator" && role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.collection("syllabus").doc(id).delete();
    return res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

/** =========================
 *  Mark a subtopic complete (teacher/coordinator)
 *  ========================= */
exports.markSubtopicComplete = async (req, res) => {
  try {
    const { id, weekNumber, topicIndex, subIndex } = req.params;

    const role = req.user?.role;
    if (!["teacher", "coordinator", "admin"].includes(role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const ref = db.collection("syllabus").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });

    const syllabus = doc.data();

    const week = syllabus.weeks.find((w) => w.weekNumber === Number(weekNumber));
    if (!week) return res.status(400).json({ error: "Invalid weekNumber" });

    const topic = week.topics?.[Number(topicIndex)];
    if (!topic) return res.status(400).json({ error: "Invalid topicIndex" });

    const sub = topic.subtopics?.[Number(subIndex)];
    if (!sub) return res.status(400).json({ error: "Invalid subIndex" });

    sub.completed = true;
    sub.status = "completed";
    sub.completedAt = new Date().toISOString();
    sub.completedBy = req.user?.email || "unknown";

    await ref.set({ ...syllabus, updatedAt: new Date().toISOString() });
    return res.json({ message: "Subtopic marked complete" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

/** =========================
 *  Approvals (coordinator-only)
 *  ========================= */
exports.approveSyllabusChanges = async (req, res) => {
  try {
    if (req.user?.role !== "coordinator" && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Only coordinators/admins can approve" });
    }

    const { id } = req.params;
    const ref = db.collection("syllabus").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });

    const syllabus = doc.data();
    syllabus.approved = true;
    syllabus.approvedAt = new Date().toISOString();
    syllabus.approvedBy = req.user.email;

    await ref.set(syllabus);
    return res.json({ message: "Syllabus approved" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.approveSubtopic = async (req, res) => {
  try {
    if (req.user?.role !== "coordinator" && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Only coordinators/admins can approve" });
    }

    const { id, weekNumber, topicIndex, subIndex } = req.params;
    const ref = db.collection("syllabus").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });

    const syllabus = doc.data();
    const week = syllabus.weeks.find((w) => w.weekNumber === Number(weekNumber));
    if (!week) return res.status(400).json({ error: "Invalid weekNumber" });

    const topic = week.topics?.[Number(topicIndex)];
    if (!topic) return res.status(400).json({ error: "Invalid topicIndex" });

    const sub = topic.subtopics?.[Number(subIndex)];
    if (!sub) return res.status(400).json({ error: "Invalid subIndex" });

    sub.approved = true;
    sub.approvedAt = new Date().toISOString();
    sub.approvedBy = req.user.email;

    syllabus.updatedAt = new Date().toISOString();
    await ref.set(syllabus);
    return res.json({ message: "Subtopic approved" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.approveTopic = async (req, res) => {
  try {
    if (req.user?.role !== "coordinator" && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Only coordinators/admins can approve" });
    }

    const { id, weekNumber, topicIndex } = req.params;
    const ref = db.collection("syllabus").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });

    const syllabus = doc.data();
    const week = syllabus.weeks.find((w) => w.weekNumber === Number(weekNumber));
    if (!week) return res.status(400).json({ error: "Invalid weekNumber" });

    const topic = week.topics?.[Number(topicIndex)];
    if (!topic) return res.status(400).json({ error: "Invalid topicIndex" });

    topic.approved = true;
    topic.approvedAt = new Date().toISOString();
    topic.approvedBy = req.user.email;

    // Also approve all subtopics under the topic
    (topic.subtopics || []).forEach((s) => {
      s.approved = true;
      s.approvedAt = new Date().toISOString();
      s.approvedBy = req.user.email;
    });

    syllabus.updatedAt = new Date().toISOString();
    await ref.set(syllabus);
    return res.json({ message: "Topic and subtopics approved" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
