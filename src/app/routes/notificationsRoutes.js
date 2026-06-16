const express = require('express')
const router = express.Router()
const { getNotifications, getNotificationCount, markNotificationAsRead, deleteNotification, deleteFcmToken, storeAnonymousFcmToken, getAnonymousNotifications, addAnonymousUser, getMadeForYouNotifications, getNotificationCountAnonymous, markNotificationAsReadAnonymous, deleteNotificationAnonymous } = require('../controllers/notificationsController')
const { authentication, verifyAccessToken } = require('../../common/middlewares/authentication')

router.get('/user-notifications', authentication, getNotifications)
router.get('/user-notifications/made-for-you', authentication, getMadeForYouNotifications)
router.get('/notification-count', authentication, getNotificationCount)
router.patch('/mark-notification-as-read/:notificationId', authentication, markNotificationAsRead)
router.delete('/delete-notification/:notificationId', authentication, deleteNotification)
router.delete('/delete-fcm-token', authentication, deleteFcmToken)
router.post('/add-anonymous-fcm-token', verifyAccessToken, storeAnonymousFcmToken)
router.get('/anonymous-notifications', verifyAccessToken, getAnonymousNotifications)
router.post('/add-anonymous-user', verifyAccessToken, addAnonymousUser)
router.get('/notification-count-anonymous', verifyAccessToken, getNotificationCountAnonymous);
router.patch('/mark-notification-as-read-anonymous/:notificationId', verifyAccessToken, markNotificationAsReadAnonymous);
router.delete('/delete-notification-anonymous/:notificationId', verifyAccessToken, deleteNotificationAnonymous)

module.exports = router