const jwt = require('jsonwebtoken')
require('dotenv').config()

// const checkRole = (role) => {
//     return (req, res, next) => {
//         const authHeader = req.header('x-access-token')

//         if (!authHeader) {
//         return res.status(401).json({
//             status: "FAILED",
//             message: "Access denied. No Authorization header provided.",
//         })
//         }

//         const token = authHeader.split(' ')[1]

//         if (!token) {
//         return res.status(401).json({
//             status: 'FAILED',
//             message: 'Access denied. No token provided'
//         })
//         }

//         try {
//         const secretKey = process.env.JWT_SECRET
//         const decoded = jwt.verify(token, secretKey)
//         req.user = decoded

//         if (req.user.userType !== role) {
//             return res.status(403).json({
//             status: 'FAILED',
//             message: 'Unauthorized access'
//             })
//         }
//         next()
//         } catch (error) {
//         res.status(403).json({
//             status: 'FAILED',
//             message: "Invalid or expired token."
//         })
//         }
//     }
// }

exports.checkRole = (requiredRole) => {

    return (req, res, next) => {
        const authHeader = req.header('x-access-token');

        if (!authHeader) {
            return res.status(401).json({
                status: "FAILED",
                message: "Access denied. No Authorization header provided.",
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const userRole = decoded.role;

            if (!userRole) {
                return res.status(403).json({
                    status: 'FAILED',
                    message: 'No role found'
                });
            }

            if (userRole !== requiredRole) {
                return res.status(403).json({
                    status: 'FAILED',
                    message: 'Unauthorized access. Must be an admin to access this resource.'
                });
            }

            next()
        } catch (error) {
            console.error('Error:', error)
            return res.status(403).json({
                status: 'FAILED',
                message: "Invalid or expired token."
            });
        }
    }
}