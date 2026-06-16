const express = require('express')
const { getUserById, getUserStats, updateProfile, getUsers, changePassword, deleteUser, updateProfileImage, deleteProfileImage, updateUser, accountStatus } = require('../controllers/usersController')
const router = express.Router()
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { upload } = require('../middlewares/uploadMiddleware')
const { checkRole } = require('../../common/middlewares/authorization')

router.get('/retrieve-user-by-id', portalAuthentication, getUserById)
router.get('/app-user-statistics', portalAuthentication, getUserStats)
router.put('/update-profile', portalAuthentication, upload.single('profileImage'), updateProfile)
router.delete('/delete-user', portalAuthentication, deleteUser)
router.post('/account-status', accountStatus);
router.get('/all-users', portalAuthentication,checkRole('admin'), getUsers)
router.patch('/change-password', portalAuthentication, changePassword)
router.post('/update-profile-image', portalAuthentication, upload.single('profileImage'), updateProfileImage)
router.delete('/delete-profile-image', portalAuthentication, deleteProfileImage)
router.put('/update-user-details/:userId', portalAuthentication, updateUser)

module.exports = router 