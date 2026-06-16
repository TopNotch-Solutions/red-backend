const jwt = require('jsonwebtoken')
const User = require('../../portal/models/UserModel')
require('dotenv').config()

exports.authentication = (req, res, next) => {
  const authHeader = req.header('x-access-token');

  if (!authHeader) {
    return res.status(401).json({
      status: "FAILED",
      message: "Access denied. No Authorization header provided.",
    });
  }

  const token = authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      status: 'FAILED',
      message: 'Access denied. No token provided'
    })
  }

  try {
    const secretKey = process.env.JWT_SECRET
    const decoded = jwt.verify(token, secretKey)
    req.user = decoded
    console.log(req.user);
    if (req.user.userType !== 'AppUser' && req.user.userType !== 'Electrician') {
      return res.status(400).json({
        status: 'FAILED',
        message: 'Unauthorized access'
      })
    }
    next()
  } catch (error) {
    res.status(403).json({
      status: 'FAILED',
      message: "Invalid or expired token."
    })
  }
}


exports.verifyAccessToken = (req, res, next) => {
  const token = req.headers['x-access-token']

  if (!token) {
    return res.status(403).json({
      status: 'FAILED',
      message: 'Access token required'
    })
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).json({
        status: 'FAILED',
        message: 'Invalid or expired access token'
      })
    }
    req.user = decoded;
    req.publicAccess = true
    next()
  })
}

exports.portalAuthentication = async (req, res, next) => {
  // This line correctly extracts the 'Bearer' token from the Authorization header.
  const authHeader = req.headers['x-access-token'];
  const token = authHeader && authHeader.split(' ')[1]; // Expects format 'Bearer TOKEN'

  // If no token is provided, return an Unauthorized status
  if (!token) {
    return res.status(401).json({
      status: 'FAILED',
      message: 'Access token required'
    });
  }

  try {
    const secretKey = process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secretKey);

    if (decoded.type !== 'access') {
      return res.status(401).json({
        status: 'FAILED',
        message: 'Invalid token type'
      });
    }

    // Second, find the user in the database using the decoded ID.
    // This ensures the user account hasn't been deleted or disabled.
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        status: 'FAILED',
        message: 'User not found'
      });
    }

    // Third, ensure the user has the correct userType for this portal.
    if (user.userType !== 'PortalUser') {
      return res.status(400).json({
        status: 'FAILED',
        message: 'Unauthorized access: incorrect user type'
      });
    }

    // Attach the full user object to the request
    req.user = user;

    next();
  } catch (error) {
    // Handle specific JWT errors to provide better feedback
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'FAILED',
        message: 'Access token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Handle all other JWT verification errors
    return res.status(401).json({
      status: 'FAILED',
      message: 'Invalid access token'
    });
  }
};

exports.electricianAuthentication = (req, res, next) => {
  const authHeader = req.header('x-access-token');

  if (!authHeader) {
    return res.status(401).json({
      status: "FAILED",
      message: "Access denied. No Authorization header provided.",
    });
  }

  const token = authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      status: 'FAILED',
      message: 'Access denied. No token provided'
    })
  }

  try {
    const secretKey = process.env.JWT_SECRET
    const decoded = jwt.verify(token, secretKey)
    req.user = decoded
    if (req.user.userType !== 'Electrician') {
      return res.status(400).json({
        status: 'FAILED',
        message: 'Unauthorized access'
      })
    }
    next()
  } catch (error) {
    res.status(403).json({
      status: 'FAILED',
      message: "Invalid or expired token."
    })
  }
}