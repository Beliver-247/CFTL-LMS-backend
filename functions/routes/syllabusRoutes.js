const express = require("express");
const {
  createSyllabus,
  getAllSyllabus,
  updateSyllabus,
  deleteSyllabus,
  getSyllabusByCourseAndMonth,
  markSubtopicComplete,
  approveSyllabusChanges,
  approveSubtopic,
  approveTopic
} = require("../controllers/syllabusController");

const { verifyFirebaseToken } = require("../middleware/firebaseAuth");           // For admins/coordinators
const { verifyTeacherToken } = require("../middleware/firebaseAuthTeacher");     // For teachers

const router = express.Router();

// 🔒 Admin & Coordinator routes
router.post("/", verifyFirebaseToken, createSyllabus);
router.get("/", verifyFirebaseToken, getAllSyllabus);
router.get("/:courseId/:month", verifyFirebaseToken, getSyllabusByCourseAndMonth);
router.put("/:id", verifyFirebaseToken, updateSyllabus);
router.delete("/:id", verifyFirebaseToken, deleteSyllabus);
router.post("/:id/approval", verifyFirebaseToken, approveSyllabusChanges);

// ✏️ Teacher-only route
router.patch(
  "/:id/weeks/:weekNumber/topics/:topicIndex/subtopics/:subIndex",
  verifyTeacherToken,
  markSubtopicComplete
);

router.patch(
  "/:id/weeks/:weekNumber/topics/:topicIndex/subtopics/:subIndex/approve",
  verifyFirebaseToken,
  approveSubtopic
);

router.patch(
  "/:id/weeks/:weekNumber/topics/:topicIndex/approve",
  verifyFirebaseToken,
  approveTopic
);


module.exports = router;
