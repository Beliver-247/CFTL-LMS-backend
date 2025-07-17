const express = require("express");
const {
  createSyllabus,
  getAllSyllabus,
  updateSyllabus,
  deleteSyllabus,
  getSyllabusByCourseAndMonth,
  markSubtopicComplete,
  approveSyllabusChanges
} = require("../controllers/syllabusController");

const { verifyFirebaseToken } = require("../middleware/firebaseAuth");

const router = express.Router();

// Admin & General
router.post("/", verifyFirebaseToken, createSyllabus);
router.get("/", verifyFirebaseToken, getAllSyllabus);
router.get("/:courseId/:month", verifyFirebaseToken, getSyllabusByCourseAndMonth);
router.put("/:id", verifyFirebaseToken, updateSyllabus);
router.delete("/:id", verifyFirebaseToken, deleteSyllabus);

// Teacher: Mark a subtopic as complete
router.patch(
  "/:id/weeks/:weekNumber/topics/:topicIndex/subtopics/:subIndex",
  verifyFirebaseToken,
  markSubtopicComplete
);

// Coordinator: Approve pending changes
router.post(
  "/:id/approval",
  verifyFirebaseToken,
  approveSyllabusChanges
);

module.exports = router;
