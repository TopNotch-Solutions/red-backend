const express = require('express')
const { signUp, login, generateOtp, validateOtp, resetPasswordOtp, resetPassword, fcmToken, createPin, generateAccessToken, checkIfUserExists } = require('../controllers/authController')
const { profileUpload } = require('../middlewares/uploadMiddleware')
const { authentication, verifyAccessToken } = require('../../common/middlewares/authentication')

const router = express.Router()

router.post('/signup', profileUpload.single('profileImage'), signUp)
router.post('/login', login)
router.post('/generate-otp', generateOtp)
router.post('/validate-otp', validateOtp)
router.post('/reset-password-otp', resetPasswordOtp)
router.put('/reset-password', resetPassword)
router.put('/create-pin', authentication, createPin)
router.get('/generate-access-token', generateAccessToken)
router.post('/verify-user-exists', checkIfUserExists)

module.exports = router