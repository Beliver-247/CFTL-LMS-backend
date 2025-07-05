const { db } = require('../config/firebase');
const { Timestamp } = require('firebase-admin/firestore');

const courseCollection = db.collection('courses');
const studentCollection = db.collection('students');

// ✅ Create a new course
exports.createCourse = async (req, res) => {
  try {
    const {
      name, program, stream, year, duration, coordinatorEmail, totalFee
    } = req.body;

    const newDoc = await courseCollection.add({
      name,
      program,
      stream: stream || null,
      year,
      duration,
      coordinatorEmail,
      totalFee,
      createdAt: Timestamp.now()
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
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
        coordinatorEmail: courseData.coordinatorEmail
      },
      totalAmount: courseData.totalFee,
      monthlyFee
    });

    res.status(200).send({ success: true });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Get students by coordinator (dashboard)
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
