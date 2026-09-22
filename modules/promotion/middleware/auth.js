const jwt = require('jsonwebtoken');

/**
 * Populates req.user if a valid token is present, but never blocks the
 * request — needed on public routes so the same handler can behave
 * differently for anonymous consumers vs. logged-in businesses/admins.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.split(' ')[1] : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    req.user = null;
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, requireAuth, requireRole };
