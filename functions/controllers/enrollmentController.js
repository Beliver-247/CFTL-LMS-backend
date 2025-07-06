const { db } = require('../config/firebase');
const { Timestamp } = require('firebase-admin/firestore');

const enrollmentCollection = db.collection('enrollments');
const studentCollection = db.collection('students');
const courseCollection = db.collection('courses');

// ✅ Enroll a student to a course
exports.enrollStudent = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    const enrolledBy = req.user.email;

    const [studentDoc, courseDoc] = await Promise.all([
      studentCollection.doc(studentId).get(),
      courseCollection.doc(courseId).get()
    ]);

    if (!studentDoc.exists) return res.status(404).send({ error: 'Student not found' });
    if (!courseDoc.exists) return res.status(404).send({ error: 'Course not found' });

    const course = courseDoc.data();
    const durationMonths = course.duration === '1 Year' ? 12 : 6;
    const monthlyFee = Math.floor(course.totalFee / durationMonths);

    const newEnrollment = {
      studentId,
      courseId,
      enrolledBy,
      enrollmentDate: Timestamp.now(),
      status: 'active',
      totalFee: course.totalFee,
      monthlyFee
    };

    const docRef = await enrollmentCollection.add(newEnrollment);
    res.status(201).send({ id: docRef.id, ...newEnrollment });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Get students enrolled in a specific course
exports.getEnrollmentsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollmentSnap = await enrollmentCollection.where('courseId', '==', courseId).get();

    const enrollments = [];
    for (const doc of enrollmentSnap.docs) {
      const enrollment = doc.data();
      const studentDoc = await studentCollection.doc(enrollment.studentId).get();

      if (studentDoc.exists) {
        enrollments.push({
          id: doc.id,
          ...enrollment,
          student: { id: studentDoc.id, ...studentDoc.data() }
        });
      }
    }

    res.status(200).send(enrollments);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Unenroll (delete) a student from a course
exports.deleteEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    await enrollmentCollection.doc(id).delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};
