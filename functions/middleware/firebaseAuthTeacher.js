const { admin, db } = require('../config/firebase');

const verifyTeacherToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Missing or invalid token' });
  }

  const idToken = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;

    // ✅ Only check teachers collection
    const teacherSnap = await db.collection('teachers')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (teacherSnap.empty) {
      return res.status(403).send({ error: 'Not a teacher' });
    }

    const teacherData = teacherSnap.docs[0].data();
    req.user = {
      email,
      uid: decodedToken.uid,
      role: teacherData.role || 'teacher',
      ...teacherData
    };

    return next();
  } catch (error) {
    return res.status(403).send({ error: 'Unauthorized' });
  }
};

module.exports = { verifyTeacherToken };
