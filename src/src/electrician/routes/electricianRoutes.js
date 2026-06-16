const express = require('express')
const { getElectricianById, updateProfile, changePassword, deleteProfileImage, logoutUser } = require('../controllers/electricianController')
const { upload } = require('../middleware/uploadMiddleware')
const { electricianAuthentication } = require('../../common/middlewares/authentication')

const router = express.Router()

router.get('/user-data', electricianAuthentication, getElectricianById)
router.put('/update-details', electricianAuthentication, upload.single('profileImage'), updateProfile)
router.delete('/log-out', electricianAuthentication, logoutUser)
router.patch('/change-password', electricianAuthentication, changePassword)
router.delete("/delete-profile-image", electricianAuthentication, deleteProfileImage)

module.exports = router