const { admin } = require('../config/firebase');

const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Missing or invalid token' });
  }

  const idToken = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // contains uid, email, etc.
    next();
  } catch (error) {
    return res.status(403).send({ error: 'Unauthorized' });
  }
};

module.exports = { verifyFirebaseToken };
