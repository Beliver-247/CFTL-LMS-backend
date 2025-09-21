// routes/syllabusRoutes.js
const express = require("express");
const router = express.Router();

const {
  createSyllabus,
  getAllSyllabus,
  updateSyllabus,
  deleteSyllabus,
  getSyllabusBySubjectAndMonth,
  markSubtopicComplete,
  approveSyllabusChanges,
  approveSubtopic,
  approveTopic
} = require("../controllers/syllabusController");

const { verifyFirebaseToken } = require("../middleware/firebaseAuth");           // admins/coordinators
const { verifyTeacherToken } = require("../middleware/firebaseAuthTeacher");     // teachers

/** =========================
 *  Create / Upsert (subject-based)
 *  ========================= */
// Teacher path
router.post("/subject", verifyTeacherToken, createSyllabus);
// Admin/Coordinator path
router.post("/admin/subject", verifyFirebaseToken, createSyllabus);

/** =========================
 *  Get by subject + month
 *  ========================= */
// Teacher path
router.get("/subject/:subjectId/:month", verifyTeacherToken, getSyllabusBySubjectAndMonth);
// Admin/Coordinator path
router.get("/admin/subject/:subjectId/:month", verifyFirebaseToken, getSyllabusBySubjectAndMonth);

/** =========================
 *  List all (admin/coordinator)
 *  ========================= */
router.get("/", verifyFirebaseToken, getAllSyllabus);

/** =========================
 *  Update by document id
 *  ========================= */
// Teacher path
router.put("/:id", verifyTeacherToken, updateSyllabus);
// Admin/Coordinator path
router.put("/admin/:id", verifyFirebaseToken, updateSyllabus);

/** =========================
 *  Delete by document id (admin/coordinator)
 *  ========================= */
router.delete("/:id", verifyFirebaseToken, deleteSyllabus);

/** =========================
 *  Progress & Approvals
 *  ========================= */
// teacher marks a subtopic complete
router.patch(
  "/:id/weeks/:weekNumber/topics/:topicIndex/subtopics/:subIndex/complete",
  verifyTeacherToken,
  markSubtopicComplete
);

// coordinator/admin approves whole syllabus doc
router.patch("/:id/approve", verifyFirebaseToken, approveSyllabusChanges);

// coordinator/admin approves a subtopic
router.patch(
  "/:id/weeks/:weekNumber/topics/:topicIndex/subtopics/:subIndex/approve",
  verifyFirebaseToken,
  approveSubtopic
);

// coordinator/admin approves a topic and its subtopics
router.patch(
  "/:id/weeks/:weekNumber/topics/:topicIndex/approve",
  verifyFirebaseToken,
  approveTopic
);

module.exports = router;
