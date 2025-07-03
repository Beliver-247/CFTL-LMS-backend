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

const app = express();

app.use(cors());

// Routes expecting JSON only
app.use('/api/syllabus', express.json(), syllabusRoutes);
app.use('/api/teachers', express.json(), teacherRoutes);
app.use('/api/parents', express.json(), parentRoutes);
app.use('/api/auth', express.json(), authRoutes);
app.use('/api/admins', express.json(), adminRoutes);

// Routes expecting multipart/form-data (do NOT use express.json())
app.use('/api/students', studentRoutes);


exports.api = onRequest(
  {
    timeoutSeconds: 300,
    memory: "1GB",
  },
  app
);