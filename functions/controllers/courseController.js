const { db } = require('../config/firebase');
const { Timestamp } = require('firebase-admin/firestore');

const courseCollection = db.collection('courses');
const studentCollection = db.collection('students');
const subjectCollection = db.collection('subjects');

const validPrograms = ['OL', 'AL'];
const validStreams = ['biology', 'maths', 'tech', 'art', 'commerce'];

// ✅ Create a new course
exports.createCourse = async (req, res) => {
  try {
    const {
      name,
      program,
      stream,
      year,
      duration,
      coordinatorEmail,
      totalFee,
      subjects,
    } = req.body;

    if (!name || !program || !year || !duration || !coordinatorEmail || !totalFee) {
      return res.status(400).send({ error: 'All required fields must be provided' });
    }

    const programUpper = program.toUpperCase();

    if (!validPrograms.includes(programUpper)) {
      return res.status(400).send({ error: 'Program must be either "OL" or "AL"' });
    }

    if (programUpper === 'AL') {
      if (!stream || !validStreams.includes(stream.toLowerCase())) {
        return res.status(400).send({ error: 'Valid stream is required for AL program' });
      }
    } else if (stream) {
      return res.status(400).send({ error: 'OL program should not have a stream' });
    }

    if (subjects && (!Array.isArray(subjects) || subjects.length > 10 || !subjects.every(id => typeof id === 'string'))) {
      return res.status(400).send({ error: 'Subjects must be an array of up to 10 subject document IDs' });
    }

    if (subjects?.length) {
      const subjectRefs = await Promise.all(subjects.map(id => subjectCollection.doc(id).get()));
      const invalid = subjectRefs.filter(doc => !doc.exists);
      if (invalid.length > 0) {
        return res.status(400).send({ error: 'One or more subject IDs are invalid' });
      }
    }

    const newDoc = await courseCollection.add({
      name,
      program: programUpper,
      stream: programUpper === 'AL' ? stream.toLowerCase() : null,
      year,
      duration,
      coordinatorEmail,
      totalFee,
      subjects: subjects || [],
      createdAt: Timestamp.now(),
    });

    res.status(201).send({ id: newDoc.id });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const snapshot = await courseCollection.get();
    const courses = [];

    for (const doc of snapshot.docs) {
      const courseData = doc.data();
      const course = { id: doc.id, ...courseData };

      if (course.subjects?.length) {
        const subjectDocs = await Promise.all(
          course.subjects.map(id => subjectCollection.doc(id).get())
        );
        course.subjectDetails = subjectDocs
          .filter(doc => doc.exists)
          .map(doc => ({ id: doc.id, ...doc.data() }));
      }

      courses.push(course);
    }

    res.status(200).send(courses);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Enroll student to a course
exports.enrollStudent = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    const studentRef = studentCollection.doc(studentId);
    const courseRef = courseCollection.doc(courseId);

    const [studentDoc, courseDoc] = await Promise.all([
      studentRef.get(),
      courseRef.get()
    ]);

    if (!studentDoc.exists) return res.status(404).send({ error: 'Student not found' });
    if (!courseDoc.exists) return res.status(404).send({ error: 'Course not found' });

    const courseData = courseDoc.data();
    const durationMonths = courseData.duration === '1 Year' ? 12 : 6;
    const monthlyFee = Math.floor(courseData.totalFee / durationMonths);

    await studentRef.update({
      enrolledCourse: {
        id: courseId,
        name: courseData.name,
        duration: courseData.duration,
        year: courseData.year,
        stream: courseData.stream,
        coordinatorEmail: courseData.coordinatorEmail,
        program: courseData.program,
      },
      totalAmount: courseData.totalFee,
      monthlyFee
    });

    res.status(200).send({ success: true });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Get students for a coordinator
exports.getStudentsForCoordinator = async (req, res) => {
  try {
    const coordinatorEmail = req.user.email;

    const courseSnap = await courseCollection
      .where('coordinatorEmail', '==', coordinatorEmail)
      .get();

    const courseIds = courseSnap.docs.map(doc => doc.id);

    if (courseIds.length === 0) return res.status(200).send([]);

    const studentsSnap = await studentCollection
      .where('enrolledCourse.id', 'in', courseIds)
      .get();

    const students = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).send(students);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Update a course
exports.updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const updateData = req.body;

    if ('program' in updateData && !validPrograms.includes(updateData.program.toUpperCase())) {
      return res.status(400).send({ error: 'Program must be either "OL" or "AL"' });
    }

    if ('stream' in updateData) {
      const courseSnapshot = await courseCollection.doc(courseId).get();
      if (!courseSnapshot.exists) {
        return res.status(404).send({ error: 'Course not found' });
      }

      const currentProgram = updateData.program
        ? updateData.program.toUpperCase()
        : courseSnapshot.data().program;

      if (currentProgram === 'OL') {
        return res.status(400).send({ error: 'OL program should not have a stream' });
      }

      if (!validStreams.includes(updateData.stream.toLowerCase())) {
        return res.status(400).send({ error: 'Invalid stream for AL program' });
      }
    }

    if ('subjects' in updateData) {
      if (!Array.isArray(updateData.subjects) || updateData.subjects.length > 10 || !updateData.subjects.every(id => typeof id === 'string')) {
        return res.status(400).send({ error: 'Subjects must be an array of up to 10 subject document IDs' });
      }

      const subjectRefs = await Promise.all(updateData.subjects.map(id => subjectCollection.doc(id).get()));
      const invalid = subjectRefs.filter(doc => !doc.exists);
      if (invalid.length > 0) {
        return res.status(400).send({ error: 'One or more subject IDs are invalid' });
      }
    }

    const courseRef = courseCollection.doc(courseId);
    const doc = await courseRef.get();

    if (!doc.exists) {
      return res.status(404).send({ error: 'Course not found' });
    }

    await courseRef.update(updateData);
    res.status(200).send({ success: true });
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

    await courseRef.delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};
