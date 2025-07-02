const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'yoursecretkey'; // store in .env for production

function createToken(payload, expiresIn = '1h') {
  return jwt.sign(payload, SECRET, { expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { createToken, verifyToken };
