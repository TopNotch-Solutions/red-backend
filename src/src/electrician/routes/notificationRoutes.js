const express = require('express')
const { getAllNotifications, getNotificationCount, markNotificationAsRead, deleteNotification } = require('../controllers/notificationsController')
const { electricianAuthentication } = require('../../common/middlewares/authentication')

const router = express.Router()

router.get('/get-notifications', electricianAuthentication, getAllNotifications)
router.get('/get-notification-count', electricianAuthentication, getNotificationCount)
router.patch('/mark-notification-as-read/:notificationId', electricianAuthentication, markNotificationAsRead)
router.delete('/delete-notification/:notificationId', electricianAuthentication, deleteNotification)

module.exports = router