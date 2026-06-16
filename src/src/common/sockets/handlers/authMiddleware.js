const jwt = require('jsonwebtoken');

exports.setupAuthMiddleware = (io) => {
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('No token provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = { id: decoded.id, userType: decoded.userType };
            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    });
};