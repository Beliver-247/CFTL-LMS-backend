const { db } = require("../config/firebase");

// Helper to validate nested syllabus structure (optional)
const validateSyllabusStructure = (syllabus) => {
  if (!syllabus.courseId || !syllabus.month || !Array.isArray(syllabus.weeks)) return false;
  for (const week of syllabus.weeks) {
    if (
      typeof week.weekNumber !== "number" ||
      !Array.isArray(week.topics)
    ) return false;

    for (const topic of week.topics) {
      if (
        typeof topic.title !== "string" ||
        typeof topic.status !== "string" ||
        !Array.isArray(topic.subtopics)
      ) return false;

      for (const sub of topic.subtopics) {
        if (
          typeof sub.title !== "string" ||
          typeof sub.status !== "string"
        ) return false;
      }
    }
  }
  return true;
};

exports.createSyllabus = async (req, res) => {
  try {
    const data = req.body;
    if (!validateSyllabusStructure(data)) {
      return res.status(400).json({ error: "Invalid syllabus structure" });
    }

    const docRef = await db.collection("syllabus").add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      coordinatorApprovedChanges: false,
    });

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

// NEW: Fetch syllabus by courseId and month
exports.getSyllabusByCourseAndMonth = async (req, res) => {
  const { courseId, month } = req.params;

  try {
    const snapshot = await db.collection("syllabus")
      .where("courseId", "==", courseId)
      .where("month", "==", month)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "No syllabus found" });
    }

    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data[0]); // Assuming one per course+month
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSyllabus = async (req, res) => {
  try {
    await db.collection("syllabus").doc(req.params.id).update({
      ...req.body,
      updatedAt: new Date().toISOString(),
    });
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

exports.markSubtopicComplete = async (req, res) => {
  const { id, weekNumber, topicIndex, subIndex } = req.params;
  const { uid, email, role } = req.user;
  console.log("Subtopic update by user:", req.user);

  if (role !== "teacher") {
    return res.status(403).json({ error: "Only teachers can perform this action" });
  }

  try {
    const docRef = db.collection("syllabus").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ error: "Syllabus not found" });

    const syllabus = doc.data();
    const weekIdx = Number(weekNumber) - 1;
    const topicIdx = Number(topicIndex);
    const subIdx = Number(subIndex);

    const subtopic = syllabus.weeks[weekIdx]?.topics[topicIdx]?.subtopics[subIdx];
    if (!subtopic) return res.status(404).json({ error: "Subtopic not found" });

    // Mark subtopic as complete
    subtopic.status = "complete";
    subtopic.markedBy = email;
    subtopic.markedAt = new Date().toISOString();
    subtopic.pendingApproval = true;

    // Check if all subtopics are completed
    const topic = syllabus.weeks[weekIdx].topics[topicIdx];
    const allSubtopicsDone = topic.subtopics.every(st => st.status === "complete");
    if (allSubtopicsDone) {
      topic.status = "complete";
      topic.pendingApproval = true;
    }

    syllabus.updatedAt = new Date().toISOString();

    await docRef.set(syllabus);
    res.status(200).json({ message: "Subtopic marked complete. Pending coordinator approval." });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveSyllabusChanges = async (req, res) => {
  const { id } = req.params;
  const { email, role } = req.user;

  if (role !== "coordinator") {
    return res.status(403).json({ error: "Only coordinators can approve changes" });
  }

  try {
    const docRef = db.collection("syllabus").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ error: "Syllabus not found" });

    const syllabus = doc.data();

    // Clear pendingApproval flags
    syllabus.weeks.forEach(week => {
      week.topics.forEach(topic => {
        if (topic.pendingApproval) {
          delete topic.pendingApproval;
          topic.approvedBy = email;
          topic.approvedAt = new Date().toISOString();
        }

        topic.subtopics.forEach(sub => {
          if (sub.pendingApproval) {
            delete sub.pendingApproval;
            sub.approvedBy = email;
            sub.approvedAt = new Date().toISOString();
          }
        });
      });
    });

    syllabus.coordinatorApprovedChanges = true;
    syllabus.updatedAt = new Date().toISOString();

    await docRef.set(syllabus);
    res.status(200).json({ message: "All pending changes approved" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

