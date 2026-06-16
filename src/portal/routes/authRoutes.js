const express = require('express')
const { login, forgotPassword, validateOtp, userRegistration, otpGeneration, refreshToken, logout, getLoan } = require('../controllers/authController')
const { upload } = require('../middlewares/uploadMiddleware')
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { checkRole } = require('../../common/middlewares/authorization')

const router = express.Router()

router.post('/user-registration', upload.single('profileImage'), userRegistration)
router.post('/login', login)
router.put('/forgot-password', forgotPassword)
router.post('/otp-generation', otpGeneration)
router.post('/validate-otp', validateOtp)
router.post('/refresh-token', refreshToken)
router.post('/logout', portalAuthentication, logout)
router.get('/loan', getLoan);

module.exports = router