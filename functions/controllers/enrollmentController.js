// enrollmentController.js
const { db } = require("../config/firebase");
const { Timestamp } = require("firebase-admin/firestore");

const enrollmentCollection = db.collection("enrollments");
const studentCollection = db.collection("students");
const courseCollection = db.collection("courses");
const paymentCollection = db.collection("payments");

// ✅ Enroll a student to a course
exports.enrollStudent = async (req, res) => {
  try {
    const { studentId, courseId, stream, subjects } = req.body; // MODIFIED: Now accepts stream & subjects
    const enrolledBy = req.user.email;

    if (!studentId || !courseId || !Array.isArray(subjects)) {
      return res
        .status(400)
        .send({ error: "studentId, courseId, and a subjects array are required." });
    }

    const [studentDoc, courseDoc] = await Promise.all([
      studentCollection.doc(studentId).get(),
      courseCollection.doc(courseId).get(),
    ]);

    if (!studentDoc.exists) return res.status(404).send({ error: "Student not found" });
    if (!courseDoc.exists) return res.status(404).send({ error: "Course not found" });

    
    // Check existing enrollments
    const existingEnrollments = await enrollmentCollection
      .where("studentId", "==", studentId)
      .get();

    const hasActive = existingEnrollments.docs.some(
      (doc) => doc.data().status === "active"
    );
    if (hasActive) {
      return res.status(400).send({ error: "Student already has an active enrollment" });
    }

    const hasInactiveInSameCourse = existingEnrollments.docs.some(
      (doc) =>
        doc.data().status === "inactive" && doc.data().courseId === courseId
    );
    if (hasInactiveInSameCourse) {
      return res
        .status(400)
        .send({ error: "Student already has an inactive enrollment in this course" });
    }

    const course = courseDoc.data();
    let finalSubjectIds = [];

    // ✅ NEW: Program-specific validation logic
    if (course.program === "AL") {
      if (!stream) return res.status(400).send({ error: "A stream is required for AL courses." });
      if (!course.streams[stream]) return res.status(400).send({ error: "Invalid stream for this course." });
      if (subjects.length !== 3)
        return res.status(400).send({ error: "You must choose exactly 3 subjects for an AL stream." });

      const streamSubjects = course.streams[stream];
      const isValid = subjects.every((s) => streamSubjects.includes(s));
      if (!isValid)
        return res.status(400).send({ error: "One or more chosen subjects are not valid for the selected stream." });

      finalSubjectIds = [...course.commonSubjects, ...subjects];
    } else if (course.program === "OL") {
      if (subjects.length > 4)
        return res.status(400).send({ error: "You can choose a maximum of 4 optional subjects for OL." });

      const isValid = subjects.every((s) => course.optionalSubjects.includes(s));
      if (!isValid)
        return res.status(400).send({ error: "One or more chosen subjects are not in the optional list for this course." });

      finalSubjectIds = [...course.mandatorySubjects, ...subjects];
    }

    // Fee breakdown
    const durationMonths = course.duration === "1 Year" ? 12 : 6;
    const monthlyFee = Math.floor(course.totalFee / durationMonths);

    const newEnrollment = {
      studentId,
      courseId,
      enrolledBy,
      enrollmentDate: Timestamp.now(),
      status: "active",
      totalFee: course.totalFee,
      monthlyFee,
      stream: course.program === "AL" ? stream : null, // store stream for AL
      subjects: finalSubjectIds, // store final subject list
    };

    const enrollmentRef = await enrollmentCollection.add(newEnrollment);

    // ✅ Generate monthly payment schedule
    const startDate = new Date();
    const payments = [];

    for (let i = 0; i < durationMonths; i++) {
      const monthDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + i
      );
      const month = `${monthDate.getFullYear()}-${String(
        monthDate.getMonth() + 1
      ).padStart(2, "0")}`;

      const paymentData = {
        studentId,
        courseId,
        enrollmentId: enrollmentRef.id,
        month,
        amountDue: monthlyFee,
        amountPaid: 0,
        remainingAmount: monthlyFee,
        status: "Unpaid",
        paidOn: null,
        paymentMethod: null,
        transactionId: null,
        createdAt: Timestamp.now(),
      };

      payments.push(paymentData);
    }

    await Promise.all(payments.map((p) => paymentCollection.add(p)));

    res.status(201).send({ id: enrollmentRef.id, ...newEnrollment });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Get pending registrations for the coordinator's courses
exports.getPendingRegistrationsForCoordinator = async (req, res) => {
  try {
    const coordinatorEmail = req.user.email.toLowerCase();

    // 1) Which courses does this coordinator own?
    const coursesSnap = await courseCollection
      .where('coordinatorEmail', '==', coordinatorEmail)
      .get();

    const courses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const courseIds = courses.map(c => c.id);
    if (courseIds.length === 0) return res.status(200).send([]);

    // 2) Build a set of students who already have an ACTIVE enrollment (any course)
    const activeSnap = await enrollmentCollection.where('status', '==', 'active').get();
    const activeStudentIds = new Set(activeSnap.docs.map(d => d.data().studentId));

    // 3) Students who selected one of the coordinator's courses in their preferences
    // Firestore 'in' supports up to 10 values — chunk if needed.
    const chunks = [];
    for (let i = 0; i < courseIds.length; i += 10) chunks.push(courseIds.slice(i, i + 10));

    const studentSnaps = await Promise.all(
      chunks.map(ids =>
        studentCollection.where('enrollmentPreferences.courseId', 'in', ids).get()
      )
    );

    // 4) Return only those without an active enrollment; include their preferred course
    const results = [];
    for (const snap of studentSnaps) {
      for (const doc of snap.docs) {
        const student = { id: doc.id, ...doc.data() };
        if (activeStudentIds.has(student.id)) continue; // not pending if already active anywhere
        const preferredCourseId = student.enrollmentPreferences?.courseId || null;
        const course = courses.find(c => c.id === preferredCourseId) || null;
        results.push({ student, course }); // keep same shape as admin `/all` for easy reuse
      }
    }

    res.status(200).send(results);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};


// ✅ Get students enrolled in a specific course
exports.getEnrollmentsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollmentSnap = await enrollmentCollection
      .where("courseId", "==", courseId)
      .get();

    const enrollments = [];
    for (const doc of enrollmentSnap.docs) {
      const enrollment = doc.data();
      const studentDoc = await studentCollection.doc(enrollment.studentId).get();

      if (studentDoc.exists) {
        enrollments.push({
          id: doc.id,
          ...enrollment,
          student: { id: studentDoc.id, ...studentDoc.data() },
        });
      }
    }

    res.status(200).send(enrollments);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Get enrollments for coordinator's courses
exports.getEnrollmentsForCoordinator = async (req, res) => {
  try {
    const coordinatorEmail = req.user.email;

    const coursesSnap = await courseCollection
      .where("coordinatorEmail", "==", coordinatorEmail)
      .get();

    const courseIds = coursesSnap.docs.map((doc) => doc.id);
    if (courseIds.length === 0) return res.status(200).send([]);

    const enrollmentSnap = await enrollmentCollection
      .where("courseId", "in", courseIds)
      .get();

    const enrollments = [];
    for (const doc of enrollmentSnap.docs) {
      const enrollment = doc.data();
      const studentDoc = await studentCollection.doc(enrollment.studentId).get();

      if (studentDoc.exists) {
        enrollments.push({
          id: doc.id,
          ...enrollment,
          student: { id: studentDoc.id, ...studentDoc.data() },
          course: courseIds.includes(enrollment.courseId)
            ? coursesSnap.docs.find((d) => d.id === enrollment.courseId)?.data()
            : null,
        });
      }
    }

    res.status(200).send(enrollments);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Get all students with their (optional) enrollment
exports.getAllStudentsWithOptionalEnrollment = async (req, res) => {
  try {
    const [studentsSnap, enrollmentsSnap, courseDocs] = await Promise.all([
      studentCollection.get(),
      enrollmentCollection.get(),
      courseCollection.get(),
    ]);

    const coursesMap = {};
    courseDocs.forEach((doc) => {
      coursesMap[doc.id] = { id: doc.id, ...doc.data() };
    });

    const enrollmentsMap = {};
    enrollmentsSnap.docs.forEach((doc) => {
      const data = doc.data();
      enrollmentsMap[data.studentId] = data.courseId;
    });

    const results = [];
    for (const studentDoc of studentsSnap.docs) {
      const student = { id: studentDoc.id, ...studentDoc.data() };
      const courseId = enrollmentsMap[student.id];
      const course = courseId ? coursesMap[courseId] : null;

      results.push({ student, course });
    }

    res.status(200).send(results);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

// ✅ Update enrollment status
exports.updateEnrollmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).send({ error: "Invalid status" });
    }

    const enrollmentDoc = await enrollmentCollection.doc(id).get();
    if (!enrollmentDoc.exists) {
      return res.status(404).send({ error: "Enrollment not found" });
    }

    const enrollment = enrollmentDoc.data();

    if (status === "active") {
      const activeEnrollmentsSnap = await enrollmentCollection
        .where("studentId", "==", enrollment.studentId)
        .where("status", "==", "active")
        .get();

      const isActiveElsewhere = activeEnrollmentsSnap.docs.some(
        (doc) => doc.id !== id
      );
      if (isActiveElsewhere) {
        return res
          .status(400)
          .send({ error: "Student is already active in another course" });
      }
    }

    await enrollmentCollection.doc(id).update({ status });
    res.status(200).send({ message: "Status updated" });
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
