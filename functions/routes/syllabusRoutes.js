const express = require("express");
const {
  createSyllabus,
  getAllSyllabus,
  updateSyllabus,
  deleteSyllabus,
} = require("../controllers/syllabusController");

const router = express.Router();

router.post("/", createSyllabus);
router.get("/", getAllSyllabus);
router.put("/:id", updateSyllabus);
router.delete("/:id", deleteSyllabus);

module.exports = router;
