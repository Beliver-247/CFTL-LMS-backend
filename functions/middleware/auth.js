const { verifyToken } = require('../config/jwt');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).send({ error: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };
