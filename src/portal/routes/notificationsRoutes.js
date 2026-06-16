const express = require('express')
const router = express.Router()
const { sendNotification, sendNotificationToOneUser, getAllNotifications, markNotificationAsRead, getNotificationCount, deleteNotification, updateNotification, notificationStats, notificationStatsById, sendSingleNotification, sentNotifications, sendNotificationToMultipleUsers, uploadNotificationImageHandler } = require('../controllers/notificationsController')
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { uploadNotificationImage } = require('../middlewares/uploadMiddleware')

router.post('/upload-image', portalAuthentication, uploadNotificationImage.single('image'), uploadNotificationImageHandler)
router.post('/send-to-all', portalAuthentication, uploadNotificationImage.single('image'), sendNotification)
router.post('/send-to-one/:userId', portalAuthentication, uploadNotificationImage.single('image'), sendNotificationToOneUser)
router.post('/send-to-multiple-users', portalAuthentication, uploadNotificationImage.single('image'), sendNotificationToMultipleUsers)
router.get('/get-notifications', portalAuthentication, getAllNotifications)
router.put('/mark-notification-as-read/:id', portalAuthentication, markNotificationAsRead)
router.get('/notification-count', portalAuthentication, getNotificationCount)
router.delete('/delete-notification', portalAuthentication, deleteNotification)
router.put('/update-notification/:notificationId', portalAuthentication, updateNotification)
router.get('/notification-stats/:id', portalAuthentication, notificationStatsById)
router.get('/notification-stats', portalAuthentication, notificationStats)
router.post('/send-single', sendSingleNotification);
router.get('/sent-notifications', portalAuthentication, sentNotifications)

module.exports = router
