// courseController.js

const { db } = require('../config/firebase');
const { Timestamp } = require('firebase-admin/firestore');

const courseCollection = db.collection('courses');
const subjectCollection = db.collection('subjects');
const enrollmentCollection = db.collection('enrollments'); // ✅ NEW

const validPrograms = ['OL', 'AL'];
const validStreams = ['biology', 'maths', 'tech', 'art', 'commerce'];

// ✅ Create a new course
exports.createCourse = async (req, res) => {
  try {
    const {
      name,
      program,
      year,
      duration,
      coordinatorEmail,
      totalFee,
      startDate, // ✅ NEW
      endDate,   // ✅ NEW
      mandatorySubjects, // ✅ For OL
      optionalSubjects,  // ✅ For OL
      commonSubjects,    // ✅ For AL
      streams,           // ✅ For AL
    } = req.body;

    if (!name || !program || !year || !duration || !coordinatorEmail || !totalFee || !startDate || !endDate) {
      return res.status(400).send({ error: 'All required fields must be provided' });
    }

    const programUpper = program.toUpperCase();
    if (!validPrograms.includes(programUpper)) {
      return res.status(400).send({ error: 'Program must be either "OL" or "AL"' });
    }

    const courseData = {
      name,
      program: programUpper,
      year,
      duration,
      coordinatorEmail,
      totalFee: Number(totalFee),
      startDate: Timestamp.fromDate(new Date(startDate)),
      endDate: Timestamp.fromDate(new Date(endDate)),
      createdAt: Timestamp.now(),
    };

    if (programUpper === 'OL') {
      if (!Array.isArray(mandatorySubjects) || !Array.isArray(optionalSubjects)) {
        return res.status(400).send({ error: 'OL courses require mandatorySubjects and optionalSubjects arrays.' });
      }
      courseData.mandatorySubjects = mandatorySubjects;
      courseData.optionalSubjects = optionalSubjects;
    } else if (programUpper === 'AL') {
      if (!Array.isArray(commonSubjects) || typeof streams !== 'object' || streams === null) {
        return res.status(400).send({ error: 'AL courses require commonSubjects array and a streams object.' });
      }
      const streamKeys = Object.keys(streams);
      if (streamKeys.length === 0 || !streamKeys.every(s => validStreams.includes(s))) {
        return res.status(400).send({ error: 'Invalid stream names provided in streams object.' });
      }
      courseData.commonSubjects = commonSubjects;
      courseData.streams = streams;
    }

    const newDoc = await courseCollection.add(courseData);
    res.status(201).send({ id: newDoc.id });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const snapshot = await courseCollection.get();
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).send(courses);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Get courses for a specific coordinator
exports.getCoursesForCoordinator = async (req, res) => {
  try {
    const coordinatorEmail = req.user.email;

    const snapshot = await courseCollection
      .where('coordinatorEmail', '==', coordinatorEmail)
      .get();

    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).send(courses);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ❌ enrollStudent → moved to enrollmentController.js
// ❌ getStudentsForCoordinator → moved to enrollmentController.js

// ✅ Update a course
exports.updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const updateData = { ...req.body };

    if ('startDate' in updateData) {
      updateData.startDate = Timestamp.fromDate(new Date(updateData.startDate));
    }
    if ('endDate' in updateData) {
      updateData.endDate = Timestamp.fromDate(new Date(updateData.endDate));
    }

    if ('program' in updateData) {
      const programUpper = updateData.program.toUpperCase();
      if (!validPrograms.includes(programUpper)) {
        return res.status(400).send({ error: 'Program must be either "OL" or "AL"' });
      }
      updateData.program = programUpper;

      if (programUpper === 'OL') {
        if (!Array.isArray(updateData.mandatorySubjects) || !Array.isArray(updateData.optionalSubjects)) {
          return res.status(400).send({ error: 'OL courses require mandatorySubjects and optionalSubjects arrays.' });
        }
      } else if (programUpper === 'AL') {
        if (!Array.isArray(updateData.commonSubjects) || typeof updateData.streams !== 'object' || updateData.streams === null) {
          return res.status(400).send({ error: 'AL courses require commonSubjects array and a streams object.' });
        }
        const streamKeys = Object.keys(updateData.streams);
        if (streamKeys.length === 0 || !streamKeys.every(s => validStreams.includes(s))) {
          return res.status(400).send({ error: 'Invalid stream names provided in streams object.' });
        }
      }
    }

    const courseRef = courseCollection.doc(courseId);
    const doc = await courseRef.get();
    if (!doc.exists) {
      return res.status(404).send({ error: 'Course not found' });
    }

    await courseRef.update(updateData);
    res.status(200).send({ success: true, id: courseId });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Delete a course
exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const courseRef = courseCollection.doc(courseId);
    const doc = await courseRef.get();

    if (!doc.exists) {
      return res.status(404).send({ error: 'Course not found' });
    }

    // Deactivate related enrollments
    const enrollmentSnap = await enrollmentCollection
      .where('courseId', '==', courseId)
      .get();

    const batch = db.batch();

    enrollmentSnap.docs.forEach(enrollmentDoc => {
      batch.update(enrollmentDoc.ref, { status: 'inactive' });
    });

    // Delete course
    batch.delete(courseRef);

    await batch.commit();

    res.status(204).send();
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};
