const express = require('express')
const { getUserById, updateProfile, fcmToken, deleteUser, logoutUser } = require('../controllers/userController')
const { authentication, authenticationAppUserAndElectrician } = require('../../common/middlewares/authentication')
const { profileUpload } = require('../middlewares/uploadMiddleware')
const { changePassword } = require('../controllers/authController')

const router = express.Router()

router.get('/get-user-by-id', authentication, getUserById);
router.delete('/log-out', authentication, logoutUser)
router.put('/update-profile', authentication, profileUpload.single('profileImage'), updateProfile)
router.post('/add-fcm-token', authentication, fcmToken)
router.patch('/remove-user', authentication, deleteUser)
router.patch('/change-password', authentication, changePassword)

module.exports = router 
