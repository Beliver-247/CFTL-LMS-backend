const authorizeRole = (allowedRoles = []) => {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).send({ error: 'Forbidden: Insufficient role' });
    }

    next();
  };
};

module.exports = { authorizeRole };
