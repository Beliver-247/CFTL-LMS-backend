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

    // 1. Try to find in admins collection
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
    } else {
      // 2. If not in admins, check if invited
      const inviteSnap = await db.collection('admin_invites')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (!inviteSnap.empty) {
        // ✅ Allow through with limited access to complete profile
        req.user = {
          email,
          uid: decodedToken.uid,
          role: 'invited-admin'
        };
      } else {
        return res.status(403).send({ error: 'User not found in admins or invites' });
      }
    }

    next();
  } catch (error) {
    return res.status(403).send({ error: 'Unauthorized' });
  }
};

module.exports = { verifyFirebaseToken };
