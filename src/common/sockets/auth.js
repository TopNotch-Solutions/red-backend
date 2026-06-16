const jwt = require('jsonwebtoken');

module.exports = (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('No token provided'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: decoded.id, userType: decoded.userType };
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
};