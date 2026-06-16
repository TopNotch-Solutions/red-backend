const express = require('express')
const { resetPasswordOtp, resetPassword, validateOtp } = require('../controllers/authController')

const router = express.Router()

router.post('/reset-password-otp', resetPasswordOtp)
router.put('/reset-password', resetPassword)
router.post('/validate-otp', validateOtp)

module.exports = router