const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const syllabusRoutes = require("./routes/syllabusRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const parentRoutes = require("./routes/parentRoutes");
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const courseRoutes = require('./routes/courseRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const paymentRoutes = require('./routes/paymentRoutes'); 
const uploadRoutes = require('./routes/uploadRoutes');
const paymentRequestRoutes = require('./routes/paymentRequestRoutes');
const registrationRequestRoutes = require('./routes/registrationRequestRoutes');

const app = express();

app.use(cors());
app.use(express.json()); // Apply JSON parsing globally


app.use('/api/syllabus', syllabusRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/payments', paymentRoutes); 
app.use('/api/uploads', uploadRoutes);
app.use('/api/payment-requests', paymentRequestRoutes);
app.use('/api/registration-requests', registrationRequestRoutes);

exports.api = onRequest(
  {
    timeoutSeconds: 300,
    memory: "1GB",
  },
  app
);