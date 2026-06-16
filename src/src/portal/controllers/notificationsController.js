const NotificationsModel = require('../models/NotificationsModel')
const UserNotifications = require('../../common/models/UsersNotificationModel')
const schedule = require('node-schedule')
const { parseISO } = require('date-fns')
const User = require('../models/UserModel')
const PortalNotificationsModel = require('../models/PortalNotificationsModel')
const usersModel = require('../../common/models/usersModel')
const CapitalizeFirstLetter = require('../../common/services/capitalization')
const { Transaction, Op } = require('sequelize')
const admin = require('../../common/services/firebase')
const { isEmpty } = require('../../common/services/isEmpty')
const AnonymousTokensModel = require('../../common/models/AnonymousTokensModel')
const FcmTokensModel = require('../../common/models/fcmTokensModel')
const AnonymoustNotificationsModel = require('../../common/models/anonymousNotificationsModel')
const AnonymousUsersModel = require('../../common/models/anonymousUsers')
const AnonymousUserNotifications = require('../../common/models/anonymousUserNotifications')


usersModel.hasMany(UserNotifications, { foreignKey: 'userId' });
NotificationsModel.hasMany(UserNotifications, { foreignKey: 'notificationId' });

// exports.sendNotification = async (req, res) => {
//     let { title, message, scheduledAt, town, suburb, isEvent, eventDate, eventStart, eventEnd } = req.body;
//     let { image } = req.body;
//     image = req.file ? req.file.path : null;

//     if (!title || isEmpty(title)) {
//         return res.status(400).json({
//             status: "FAILED",
//             message: "Title cannot be blank"
//         });
//     }

//     if (!message || isEmpty(message)) {
//         return res.status(400).json({
//             status: "FAILED",
//             message: "Message cannot be blank"
//         });
//     }

//     title = CapitalizeFirstLetter(title);
//     message = CapitalizeFirstLetter(message);

//     try {
//         const whereClause = { userType: 'AppUser' };
//         if (town) whereClause.town = town;
//         if (suburb) whereClause.suburb_name = suburb;

//         const users = await usersModel.findAll({
//             attributes: ['id'],
//             where: whereClause
//         });

//         const anonymousUsers = await AnonymousUsersModel.findAll({})

//         const fcmTokensData = await FcmTokensModel.findAll({
//             attributes: ['fcmToken'],
//             where: {
//                 userId: users.map(user => user.id)
//             }
//         });

//         const anonymousTokensData = await AnonymousTokensModel.findAll({
//             attributes: ['fcmToken']
//         });

//         const userTokens = fcmTokensData.map(t => t.fcmToken?.trim()).filter(Boolean);
//         const anonTokens = anonymousTokensData.map(t => t.fcmToken?.trim()).filter(Boolean);
//         const allTokens = [...new Set([...userTokens, ...anonTokens])];

//         if ((!users.length && !anonymousUsers.length) || !allTokens.length) {
//             return res.status(404).json({
//                 status: 'FAILED',
//                 message: 'No users or valid tokens found to send notifications'
//             });
//         }

//         let notification = await NotificationsModel.create({
//             title,
//             message,
//             image: image || null,
//             scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
//             createdAt: new Date(),
//             isEvent,
//             eventDate,
//             eventStart,
//             eventEnd,
//             notificationType: "notification"
//         });

//         if (anonymousUsers.length > 0) {
//             const anonNotificationsData = anonymousUsers.map(user => ({
//                 userId: user.id,
//                 title,
//                 message,
//                 image: image || null,
//                 scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
//                 createdAt: new Date(),
//                 isEvent: !!isEvent,
//                 eventDate: isEvent ? eventDate : null,
//                 eventStart: isEvent ? eventStart : null,
//                 eventEnd: isEvent ? eventEnd : null,
//                 notificationType: "notification"
//             }));

//             await AnonymoustNotificationsModel.bulkCreate(anonNotificationsData,{ returning: true });
//         }
//         const existingUserNotifications = await UserNotifications.findAll({
//             where: { notificationId: notification.id }
//         });

//         // const existingAnonymousNotifications = await AnonymousUserNotifications.findAll({
//         //     where: { notificationId: notification.id }
//         // });
//         console.log("dsxz")
//         const sendNotifications = async () => {
//             const newUserNotifications = users
//                 .filter(user => !existingUserNotifications.some(n => n.userId === user.id))
//                 .map(user => ({
//                     userId: user.id,
//                     notificationId: notification.id,
//                     createdAt: new Date()
//                 }));

//             if (newUserNotifications.length > 0) {
//                 await UserNotifications.bulkCreate(newUserNotifications);
//             }

            
// if (anonymousUsers.length > 0) {
//                     const anonUserNotificationData = anonymousUsers.map(user => ({
//                         userId: user.id,
//                         notificationId: notification.id, 
//                         createdAt: new Date(),
//                         isRead: false
//                     }));

//                     await AnonymousUserNotifications.bulkCreate(anonUserNotificationData);
//                 }

//             if (allTokens.length > 0) {
//                 const payload = {
//                     notification: {
//                         title,
//                         body: message
//                     },
//                     data: {
//                         navigationId: 'Notifications',
//                         notificationId: notification.id.toString()
//                     },
//                     tokens: allTokens
//                 };

//                 try {
//                     const response = await admin.messaging().sendEachForMulticast(payload);
//                     console.log(`${response.successCount} push notifications sent successfully`);

//                     await Promise.all(
//                         response.responses.map(async (res, i) => {
//                             const token = payload.tokens[i];
//                             if (!res.success) {
//                                 const errorCode = res.error?.errorInfo?.code;
//                                 console.error(`Token ${token} failed:`, res.error);

//                                 if (
//                                     errorCode === 'messaging/registration-token-not-registered' ||
//                                     errorCode === 'messaging/invalid-argument'
//                                 ) {
//                                     console.log(`🧹 Dead token cleaned: ${token}`);
//                                 }
//                             }
//                         })
//                     );

//                 } catch (error) {
//                     console.error('Error sending push notifications:', error);
//                 }
//             }
//         };

//         if (scheduledAt) {
//             const scheduleDate = new Date(scheduledAt);
//             if (scheduleDate <= new Date()) {
//                 return res.status(400).json({
//                     status: 'FAILED',
//                     message: 'Scheduled time must be greater than current time'
//                 });
//             }

//             schedule.scheduleJob(scheduleDate, sendNotifications);

//             return res.status(200).json({
//                 status: 'SUCCESS',
//                 message: `Notification successfully scheduled for ${scheduleDate}`,
//                 notificationId: notification.id,
//                 isEvent,
//                 eventDetails: isEvent ? { eventDate, eventStart, eventEnd } : null
//             });
//         } else {
//             await sendNotifications();
//             return res.status(200).json({
//                 status: 'SUCCESS',
//                 message: 'Notification successfully sent to all users',
//                 notificationId: notification.id
//             });
//         }

//     } catch (error) {
//         console.error('Error sending notifications to all users:', error);
//         res.status(500).json({
//             status: 'FAILED',
//             message: 'Internal server error'
//         });
//     }
// };

exports.sendNotification = async (req, res) => {
    let { title, message, scheduledAt, town, suburb, isEvent, eventDate, eventStart, eventEnd } = req.body;
    let { image } = req.body;
    image = req.file ? req.file.path : null;

    if (!title || isEmpty(title)) {
        return res.status(400).json({ status: "FAILED", message: "Title cannot be blank" });
    }

    if (!message || isEmpty(message)) {
        return res.status(400).json({ status: "FAILED", message: "Message cannot be blank" });
    }

    title = CapitalizeFirstLetter(title);
    message = CapitalizeFirstLetter(message);

    try {
        // Fetch AppUsers
        const whereClause = { userType: 'AppUser' };
        if (town) whereClause.town = town;
        if (suburb) whereClause.suburb_name = suburb;

        const users = await usersModel.findAll({ attributes: ['id'], where: whereClause });
        const anonymousUsers = await AnonymousUsersModel.findAll({ attributes: ['id'] });

        // Fetch FCM tokens
        const fcmTokensData = await FcmTokensModel.findAll({
            attributes: ['fcmToken'],
            where: { userId: users.map(u => u.id)}
        });

        // const anonymousTokensData = await AnonymousUsersModel.findAll({
        //     attributes: ['fcmToken']
        // });

        const userTokens = fcmTokensData.map(t => t.fcmToken?.trim()).filter(Boolean);
        //const anonTokens = anonymousTokensData.map(t => t.fcmToken?.trim()).filter(Boolean);
        const allTokens = [...new Set([...userTokens])];

        if ((!users.length && !anonymousUsers.length)) {
            return res.status(404).json({ status: 'FAILED', message: 'No users or valid tokens found' });
        }

        // 1️⃣ Create general notification for AppUsers
        let notification = await NotificationsModel.create({
            title,
            message,
            image: image || null,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            createdAt: new Date(),
            isEvent,
            eventDate,
            eventStart,
            eventEnd,
            notificationType: "notification"
        });

        // Map to UserNotifications
        const existingUserNotifications = await UserNotifications.findAll({
            where: { notificationId: notification.id }
        });

        // 2️⃣ Create notifications for AnonymousUsers
        let anonNotifications = [];
        if (anonymousUsers.length > 0) {
            const anonNotificationsData = anonymousUsers.map(user => ({
                userId: user.id,
                title,
                message,
                image: image || null,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                createdAt: new Date(),
                isEvent: false,
                eventDate: isEvent ? eventDate : null,
                eventStart: isEvent ? eventStart : null,
                eventEnd: isEvent ? eventEnd : null,
                notificationType: "notification"
            }));

            anonNotifications = await AnonymoustNotificationsModel.bulkCreate(anonNotificationsData, { returning: true });
        }

        // Function to send notifications and save to join tables
        const sendNotifications = async () => {
            // AppUserNotifications
            const newUserNotifications = users
                .filter(u => !existingUserNotifications.some(n => n.userId === u.id))
                .map(u => ({ userId: u.id, notificationId: notification.id, createdAt: new Date() }));
            if (newUserNotifications.length > 0) await UserNotifications.bulkCreate(newUserNotifications);

            // AnonymousUserNotifications
            if (anonNotifications.length > 0) {
                const anonUserNotificationData = anonNotifications.map(n => ({
                    userId: n.userId,
                    notificationId: n.id,
                    createdAt: new Date(),
                    isRead: false
                }));
                await AnonymousUserNotifications.bulkCreate(anonUserNotificationData);
            }

            // Send push notifications via FCM
            if (allTokens.length > 0) {
                const payload = {
                    notification: { title, body: message },
                    data: { navigationId: 'Notifications', notificationId: notification.id.toString() },
                    tokens: allTokens
                };

                try {
                    const response = await admin.messaging().sendEachForMulticast(payload);
                    console.log(`${response.successCount} push notifications sent successfully`);

                    // Remove dead tokens
                    response.responses.forEach((res, i) => {
                        const token = payload.tokens[i];
                        if (!res.success) {
                            const errorCode = res.error?.errorInfo?.code;
                            if (errorCode === 'messaging/registration-token-not-registered' ||
                                errorCode === 'messaging/invalid-argument') {
                                console.log(`🧹 Dead token cleaned: ${token}`);
                            }
                        }
                    });
                } catch (err) {
                    console.error('Error sending push notifications:', err);
                }
            }
        };

        // Schedule if necessary
        if (scheduledAt) {
            const scheduleDate = new Date(scheduledAt);
            if (scheduleDate <= new Date()) {
                return res.status(400).json({ status: 'FAILED', message: 'Scheduled time must be in the future' });
            }
            schedule.scheduleJob(scheduleDate, sendNotifications);
            return res.status(200).json({
                status: 'SUCCESS',
                message: `Notification scheduled for ${scheduleDate}`,
                notificationId: notification.id,
                isEvent,
                eventDetails: isEvent ? { eventDate, eventStart, eventEnd } : null
            });
        } else {
            await sendNotifications();
            return res.status(200).json({
                status: 'SUCCESS',
                message: 'Notification sent to all users',
                notificationId: notification.id
            });
        }

    } catch (error) {
        console.error('Error sending notifications:', error);
        res.status(500).json({ status: 'FAILED', message: 'Internal server error' });
    }
};
exports.sendNotificationToOneUser = async (req, res) => {
    const { userId } = req.params;
    let { title, message, scheduledAt } = req.body;
    let image = req.file ? req.file.path : null;

    if (!title || isEmpty(title)) {
        return res.status(400).json({ status: "FAILED", message: "Title cannot be blank" });
    }

    if (!message || isEmpty(message)) {
        return res.status(400).json({ status: 'FAILED', message: 'Message cannot be blank' });
    }

    title = CapitalizeFirstLetter(title);
    message = CapitalizeFirstLetter(message);

    try {
        const user = await usersModel.findByPk(userId, {
            attributes: ['id'],
            where: { userType: 'AppUser' }
        });

        if (!user) {
            return res.status(404).json({ status: 'FAILED', message: 'User not found' });
        }

        // Check if notification already exists
        let notification = await NotificationsModel.findOne({
            where: { title, message, scheduledAt, image, scheduledAt: scheduledAt ? new Date(scheduledAt) : null }
        });

        if (!notification) {
            notification = await NotificationsModel.create({
                title,
                message,
                image: image || null,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                createdAt: new Date(),
                notificationType: "MadeForYou"
            });
        }

        const sendNotification = async () => {
            // Link notification to user
            const existingUserNotification = await UserNotifications.findOne({
                where: { userId: user.id, notificationId: notification.id }
            });

            if (!existingUserNotification) {
                await UserNotifications.create({
                    userId: user.id,
                    notificationId: notification.id,
                    createdAt: new Date()
                });
            }

            // Get user's FCM token
            const fcmTokensData = await FcmTokensModel.findOne({
                attributes: ['fcmToken'],
                where: { userId: user.id }
            });

            if (fcmTokensData?.fcmToken) {
                const payload = {
                    notification: {
                        title,
                        body: message,
                        image: image || undefined
                    },
                    data: {
                        navigationId: 'Notifications',
                        notificationId: notification.id
                    },
                    token: fcmTokensData.fcmToken
                };

                try {
                    const response = await admin.messaging().send(payload);
                    console.log(`Push notification sent to user ${user.id}:`, response);
                } catch (error) {
                    console.error('Error sending push notification:', error);
                }
            } else {
                console.log(`User ${user.id} has no FCM token. Notification saved but no push sent.`);
            }
        };

        if (scheduledAt) {
            const scheduleDate = parseISO(scheduledAt);

            if (scheduleDate <= new Date()) {
                return res.status(400).json({
                    status: 'FAILED',
                    message: 'Scheduled time cannot be in the past'
                });
            }

            schedule.scheduleJob(scheduleDate, sendNotification);

            return res.status(200).json({
                status: 'SUCCESS',
                message: `Notification successfully scheduled for ${scheduleDate}`,
                notificationId: notification.id
            });
        } else {
            await sendNotification();

            return res.status(200).json({
                status: 'SUCCESS',
                message: 'Notification sent successfully',
                notificationId: notification.id
            });
        }

    } catch (error) {
        console.error('Error sending notification to user:', error);
        res.status(500).json({ status: 'FAILED', message: 'Internal server error: ' + error.message });
    }
};
exports.sendSingleNotification = async (req, res) => {
    const { token, title, body, data = {} } = req.body;

    if (!token || !title || !body) {
        return res.status(400).json({ message: 'Missing token, title, or body' });
    }

    const message = {
        token,
        notification: {
            title,
            body,
        },
        data,
    };

    try {
        const response = await admin.messaging().send(message);

        console.log(`✅ Token is valid. Notification sent to ${token}`);
        console.log(`📦 Firebase response:`, response);

        return res.status(200).json({
            message: 'Notification sent successfully',
            tokenValid: true,
            response,
        });
    } catch (error) {
        const errorCode = error?.errorInfo?.code;
        const errorMsg = error?.errorInfo?.message || 'Unknown error while sending notification';

        if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-argument'
        ) {
            console.warn(`❌ Invalid FCM token: ${token}`);
            console.warn(`🧨 Reason: ${errorMsg}`);
            return res.status(400).json({
                message: 'Invalid or unregistered FCM token',
                tokenValid: false,
                error: errorMsg,
            });
        }

        console.error(`🔥 Error sending to token: ${token}`);
        console.error(error);
        return res.status(500).json({
            message: 'Failed to send notification',
            tokenValid: null,
            error: errorMsg,
        });
    }
};

exports.getAllNotifications = async (req, res) => {
    const userId = req.user.id;

    if (!userId) {
        return res.status(400).json({
            status: "FAILED",
            message: "User id is empty."
        });
    }

    try {
        const user = User.findByPk(userId)

        if (!user) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'User not found'
            })
        }

        const notifications = await PortalNotificationsModel.findAll({ where: { userId } })

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Notifications retrieved successfully',
            notifications: notifications
        })
    } catch (error) {
        console.error("Error retrieving all notifications:", error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.getNotificationCount = async (req, res) => {
    const userId = req.user.id;

    if (!userId) {
        return res.status(400).json({
            status: "FAILED",
            message: "User id is empty."
        });
    }

    try {
        const notificationCount = await PortalNotificationsModel.count({
            where: {
                userId: userId,
                isRead: 0
            }
        })

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Notification count successfully retrieved',
            count: notificationCount
        })
    } catch (error) {
        console.error('Error retrieving the notification count:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.markNotificationAsRead = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params

    if (!userId) {
        return res.status(400).json({
            status: "FAILED",
            message: "User id is empty."
        });
    }

    try {

        if (!userId) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'User ID is required'
            })
        }

        const notifications = await PortalNotificationsModel.findOne({
            where: {
                userId: userId,
                id: id
            }
        })

        if (!notifications) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Notification not found'
            })
        }

        notifications.isRead = true
        await notifications.save()

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Notification marked as read successfully'
        })
    } catch (error) {
        console.error('Error marking notifications:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.deleteNotification = async (req, res) => {
    const { notificationIds } = req.body;
    const userId = req.user.id;

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Notification IDs must be a non-empty array'
        });
    }

    if (!userId) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'User ID is required'
        });
    }

    try {
        const deletedCount = await PortalNotificationsModel.destroy({
            where: {
                userId: userId,
                id: {
                    [Op.in]: notificationIds
                }
            }
        });

        if (deletedCount === 0) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'No notifications found for this user with the provided IDs'
            });
        }

        res.status(200).json({
            status: 'SUCCESS',
            message: `${deletedCount} notification(s) deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        });
    }
};

exports.updateNotification = async (req, res) => {
    const { notificationId } = req.params
    let { title, message, scheduledAt } = req.body
    const image = req.file ? req.file.path : null

    try {
        const notification = await NotificationsModel.findByPk(notificationId)

        if (!notification) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Notification not found'
            })
        }

        await notification.update({ title, message, image, scheduledAt })

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Notification updated successfully'
        })
    } catch (error) {
        console.error('Error updating notification', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.notificationStatsById = async (req, res) => {
    const { id } = req.params

    try {
        const notification = await NotificationsModel.findOne({
            where: { id }
        })

        if (!notification) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Notification not found'
            })
        }

        const unReadNotifications = await UserNotifications.count({
            where: {
                notificationId: id,
                isRead: false
            }
        })

        const readNotifications = await UserNotifications.count({
            where: {
                notificationId: id,
                isRead: true
            }
        })

        const userCount = await UserNotifications.count({
            where: { notificationId: id },
            distinct: true,
            col: 'userId'
        })

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Notifiction stats retrieved successfully',
            notification: {
                id: notification.id,
                title: notification.title,
                message: notification.message,
                scheduledAt: notification.scheduleAt,
                createdAt: notification.createdAt
            },
            stats: {
                unreadCount: unReadNotifications,
                readCount: readNotifications,
                userCount
            }
        })
    } catch (error) {
        console.error('Error', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.notificationStats = async (req, res) => {
    try {
        const notification = await NotificationsModel.findAll()

        if (!notification) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Notification not found'
            })
        }

        const notificationStats = await Promise.all(
            notification.map(async (notification) => {
                const unreadCount = await UserNotifications.count({
                    where: {
                        notificationId: notification.id,
                        isRead: false
                    }
                })

                const readCount = await UserNotifications.count({
                    where: {
                        notificationId: notification.id,
                        isRead: true
                    }
                })

                const userCount = await UserNotifications.count({
                    where: { notificationId: notification.id },
                    distinct: true,
                    col: 'userId'
                })

                return {
                    id: notification.id,
                    title: notification.title,
                    message: notification.message,
                    scheduledAt: notification.scheduleAt,
                    createdAt: notification.createdAt,
                    stats: {
                        unreadCount,
                        readCount,
                        userCount
                    }
                }
            })
        )

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Notifiction stats retrieved successfully',
            data: notificationStats
        })
    } catch (error) {
        console.error('Error', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.sentNotifications = async (req, res) => {
    try {
        const notifications = await NotificationsModel.findAll({
            where: {
                notificationType: 'notification'
            }
        })

        if (notifications.length === 0) {
            return res.status(200).json({
                status: 'SUCCESS',
                message: 'No notifications sent'
            })
        }

        return res.status(200).json({
            status: 'SUCSESS',
            message: 'Sent notifications retrieved successfully',
            notifications
        })
    } catch (error) {
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error'
        })
    }
}
