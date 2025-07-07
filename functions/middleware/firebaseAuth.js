const { admin, db } = require('../config/firebase');

const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Missing or invalid token' });
  }

  const idToken = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;

    // 1. Check admins
    const adminSnap = await db.collection('admins')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!adminSnap.empty) {
      const userData = adminSnap.docs[0].data();
      req.user = {
        email,
        uid: decodedToken.uid,
        role: userData.role || 'admin'
      };
      return next();
    }

    // 2. Check admin_invites
    const inviteSnap = await db.collection('admin_invites')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!inviteSnap.empty) {
      req.user = {
        email,
        uid: decodedToken.uid,
        role: 'invited-admin'
      };
      return next();
    }

// 🔧 3. Check teachers
const teacherSnap = await db.collection('teachers')
  .where('email', '==', email)
  .limit(1)
  .get();

if (!teacherSnap.empty) {
  const teacherData = teacherSnap.docs[0].data();
  req.user = {
    email,
    uid: decodedToken.uid,
    role: teacherData.role || 'teacher',
    ...teacherData
  };
} else {
  // ✅ Allow access to complete profile route for new Google sign-ins
  req.user = {
    email,
    uid: decodedToken.uid,
    role: 'incomplete-teacher',
  };
}

return next();

  } catch (error) {
    return res.status(403).send({ error: 'Unauthorized' });
  }
};


module.exports = { verifyFirebaseToken };