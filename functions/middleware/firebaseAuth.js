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

    // ✅ 1. Admins & Coordinators
    const adminSnap = await db.collection('admins')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!adminSnap.empty) {
      const adminData = adminSnap.docs[0].data();
      req.user = {
        email,
        uid: decodedToken.uid,
        role: adminData.role || 'admin', // could be admin, coordinator
        ...adminData,
      };
      return next();
    }

    // ✅ 2. Invited Admins
    const inviteSnap = await db.collection('admin_invites')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!inviteSnap.empty) {
      req.user = {
        email,
        uid: decodedToken.uid,
        role: 'invited-admin',
      };
      return next();
    }

    // ❌ Fallback: not an admin
    return res.status(403).send({ error: 'Unauthorized: Admin access only' });
  } catch (error) {
    return res.status(403).send({ error: 'Unauthorized' });
  }
};

module.exports = { verifyFirebaseToken };
