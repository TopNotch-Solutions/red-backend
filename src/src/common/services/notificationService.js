const userModel = require('../models/usersModel');
const admin = require('../services/firebase')
const NotificationsModel = require('../../portal/models/NotificationsModel');
const UserNotifications = require('../models/UsersNotificationModel');
const { Op } = require('sequelize');
const FcmTokensModel = require('../models/fcmTokensModel');
const PaymentsModel = require('../models/paymentsModel');
const sequelize = require('../../config/db');

exports.sendCutoffWarningNotifications = async () => {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const overdueUsers = await userModel.findAll({
            where: { customerType: 'postpaid' },
            include: [
                {
                    model: PaymentsModel,
                    as: 'payments',
                    required: true,
                    where: {
                        paymentBy: { [Op.lte]: oneWeekAgo },
                        status: "Pending"
                    }
                },
                {
                    model: FcmTokensModel,
                    as: 'fcmTokens',
                    attributes: ['fcmToken'],
                    required: false
                }
            ],
            attributes: ["id"]
        });

        console.log(`Found ${overdueUsers.length} overdue users.`);

        if (!overdueUsers.length) {
            console.log("✅ No overdue payments found. No notifications sent.");
            return;
        }

        const notification = await NotificationsModel.create({
            title: "Cut off warning",
            message: "Your account is overdue. Please make payment to avoid service interruption",
            createdAt: new Date(),
            notificationType: "MadeForYou"
        });

        const userNotifications = overdueUsers.map(user => ({
            userId: user.id,
            notificationId: notification.id,
            createdAt: new Date(),
            notificationType: "MadeForYou",
            isRead: false
        }));

        await UserNotifications.bulkCreate(userNotifications);

        const allFcmTokens = overdueUsers
            .flatMap(user => user.fcmTokens || [])
            .map(tokenModel => tokenModel.fcmToken);

        if (allFcmTokens.length > 0) {
            console.log(`Attempting to send push notifications to ${allFcmTokens.length} devices.`);
            const pushNotificationPromises = allFcmTokens
                .map(async (token) => {
                    const payload = {
                        notification: {
                            title: "Cut off warning",
                            body: "Your account is overdue. Please make payment to avoid service interruption"
                        },
                        data: {
                            notificationId: notification.id.toString(),
                            navigationId: 'Notifications'
                        },
                        token: token
                    };
                    try {
                        const response = await admin.messaging().send(payload);
                        return console.log(`✅ Push notification sent to token:`, response);
                    } catch (error) {
                        return console.error(`❌ Error sending push notification to token:`, error);
                    }
                });
            await Promise.all(pushNotificationPromises);
        } else {
            console.log("No FCM tokens found. No push notifications sent.");
        }

        console.log("✅ Cutoff notifications sent successfully.");
    } catch (error) {
        console.error("❌ Error sending cutoff notifications:", error);
    }
};

exports.sendPaymentReminders = async () => {
    try {
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

        const targetDate = oneWeekFromNow.toISOString().split('T')[0];

        const reminderUsers = await userModel.findAll({
            where: { customerType: 'postpaid' },
            include: [
                {
                    model: PaymentsModel,
                    as: 'payments',
                    required: true,
                    where: {
                        paymentBy: sequelize.where(
                            sequelize.fn('date', sequelize.col('paymentBy')),
                            '=',
                            targetDate
                        ),
                        status: { [Op.not]: "Completed" }
                    }
                },
                {
                    model: FcmTokensModel,
                    as: 'fcmTokens',
                    attributes: ['fcmToken'],
                    required: false
                }
            ],
            attributes: ["id", "email", "firstName"]
        });

        console.log(`Found ${reminderUsers.length} users with payments due in one week.`);

        if (!reminderUsers.length) {
            console.log("✅ No upcoming payments found. No reminders sent.");
            return;
        }

        const notification = await NotificationsModel.create({
            title: "Payment Reminder",
            message: "Your payment is due in one week. Please make your payment to avoid service interruption.",
            createdAt: new Date(),
            notificationType: "MadeForYou"
        });

        const userNotifications = reminderUsers.map(user => ({
            userId: user.id,
            notificationId: notification.id,
            createdAt: new Date(),
            notificationType: "MadeForYou",
            isRead: false
        }));

        await UserNotifications.bulkCreate(userNotifications);
        const allFcmTokens = reminderUsers
            .flatMap(user => user.fcmTokens || [])
            .map(tokenModel => tokenModel.fcmToken);

        if (allFcmTokens.length > 0) {
            console.log(`Attempting to send push notifications to ${allFcmTokens.length} devices.`);
            const pushNotificationPromises = allFcmTokens
                .map(async (token) => {
                    const payload = {
                        notification: {
                            title: "Payment Reminder",
                            body: "Your payment is due in one week. Please make your payment to avoid service interruption."
                        },
                        data: {
                            notificationId: notification.id.toString(),
                            navigationId: 'Notifications'
                        },
                        token: token
                    };
                    try {
                        const response = await admin.messaging().send(payload);
                        return console.log(`✅ Push notification sent to token:`, response);
                    } catch (error) {
                        return console.error(`❌ Error sending push notification to token:`, error);
                    }
                });
            await Promise.all(pushNotificationPromises);
        } else {
            console.log("No FCM tokens found. No push notifications sent.");
        }

        console.log("✅ Payment reminders sent successfully.");
    } catch (error) {
        console.error("❌ Error sending payment reminders:", error);
    }
};

exports.sendServiceInterruptionNotifications = async () => {
    try {
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

        const overdueUsers = await userModel.findAll({
            where: { customerType: "postpaid" },
            include: [
                {
                    model: PaymentsModel,
                    as: 'payments',
                    required: true,
                    where: {
                        paymentBy: { [Op.lte]: tenDaysAgo },
                        status: { [Op.not]: "Completed" }
                    }
                },
                {
                    model: FcmTokensModel,
                    as: 'fcmTokens',
                    attributes: ['fcmToken'], 
                    required: false
                }
            ],
            attributes: ["id", "email", "firstName"]
        });

        console.log(`Found ${overdueUsers.length} users with payments overdue by 10+ days.`);

        if (!overdueUsers.length) {
            console.log("✅ No users with payments overdue by 10+ days found. No service interruption notifications sent.");
            return;
        }

        const notification = await NotificationsModel.create({
            title: "Service Interruption Notice",
            message: "Your service has been interrupted due to an overdue payment. Please make a payment to restore service.",
            createdAt: new Date(),
            notificationType: "MadeForYou"
        });

        const userNotifications = overdueUsers.map(user => ({
            userId: user.id,
            notificationId: notification.id,
            createdAt: new Date(),
            notificationType: "MadeForYou",
            isRead: false
        }));

        await UserNotifications.bulkCreate(userNotifications);

        const allFcmTokens = overdueUsers
            .flatMap(user => user.fcmTokens || [])
            .map(tokenModel => tokenModel.fcmToken);

        if (allFcmTokens.length > 0) {
            console.log(`Attempting to send push notifications to ${allFcmTokens.length} devices.`);
            const pushNotificationPromises = allFcmTokens
                .map(async (token) => {
                    const payload = {
                        notification: {
                            title: "Service Interruption Notice",
                            body: "Your service has been interrupted due to an overdue payment. Please make a payment to restore service."
                        },
                        data: {
                            notificationId: notification.id.toString(),
                            navigationId: 'Notifications'
                        },
                        token: token
                    };
                    try {
                        const response = await admin.messaging().send(payload);
                        return console.log(`✅ Push notification sent to token:`, response);
                    } catch (error) {
                        return console.error(`❌ Error sending push notification to token:`, error);
                    }
                });
            await Promise.all(pushNotificationPromises);
        } else {
            console.log("No FCM tokens found. No push notifications sent.");
        }

        console.log("✅ Service interruption notifications sent successfully.");
    } catch (error) {
        console.error("❌ Error sending service interruption notifications:", error);
    }
};

exports.sendPushNotification = async (userId, title, body, data = {}) => {
    try {
        const fcmTokens = await FcmTokensModel.findAll({
            where: { userId: userId },
            attributes: ['id', 'fcmToken']
        });

        if (!fcmTokens || fcmTokens.length === 0) {
            console.log(`No FCM tokens found for user ${userId}`);
            return false;
        }

        const message = {
            notification: {
                title: title,
                body: body
            },
            data: {
                ...data,
                userId: userId.toString(),
                timestamp: new Date().toISOString()
            },
            android: {
                notification: {
                    channelId: 'chat_messages',
                    priority: 'high',
                    defaultSound: true,
                    defaultVibrateTimings: true
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1
                    }
                }
            }
        };

        const tokens = fcmTokens.map(tokenObj => tokenObj.fcmToken);
        const invalidTokenIds = [];
        let successCount = 0;

        if (tokens.length === 1) {
            try {
                const response = await admin.messaging().send({
                    ...message,
                    token: tokens[0]
                });
                console.log('Push notification sent successfully:', response);
                successCount = 1;
            } catch (error) {
                console.error('Error sending to single token:', error);
                if (this.isInvalidTokenError(error)) {
                    invalidTokenIds.push(fcmTokens[0].id);
                }
            }
        } else {
            try {
                const response = await admin.messaging().sendEachForMulticast({
                    ...message,
                    tokens: tokens
                });

                console.log(`Push notifications sent. Success: ${response.successCount}, Failed: ${response.failureCount}`);
                successCount = response.successCount;

                if (response.failureCount > 0) {
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success) {
                            console.error(`Failed to send notification to token ${tokens[idx]}:`, resp.error);
                        }
                    });
                }
            } catch (error) {
                console.error('Error sending multicast notification:', error);
            }
        }

        if (invalidTokenIds.length > 0) {
            await FcmTokensModel.destroy({
                where: { id: { [Op.in]: invalidTokenIds } }
            });
            console.log(`Removed ${invalidTokenIds.length} invalid FCM tokens for user ${userId}`);
        }

        return successCount > 0;

    } catch (error) {
        console.error('Error sending push notification:', error);
        return false;
    }
}

exports.sendMessageNotification = async (userId, senderName, message, issueId = null, conversationId = null) => {
    try {
        const notification = await NotificationsModel.create({
            title: `New message from Erongo Red Agents`,
            message: message.length > 100 ? message.substring(0, 100) + '...' : message,
            isEvent: false,
            notificationType: 'message'
        });

        await UserNotifications.create({
            userId: userId,
            notificationId: notification.id,
            createdAt: new Date(),
            isRead: false,
            notificationType: 'message'
        });

        const notificationData = {
            type: 'message',
            notificationId: notification.id
        };

        if (issueId) {
            notificationData.issueId = issueId.toString();
        }

        if (conversationId) {
            notificationData.conversationId = conversationId.toString();
        }

        // await sendPushNotification(
        //     userId,
        //     `New message from ${senderName}`,
        //     message.length > 100 ? message.substring(0, 100) + '...' : message,
        //     notificationData
        // );

        console.log(`Message notification sent to user ${userId}`);
        return true;

    } catch (error) {
        console.error('Error sending message notification:', error);
        return false;
    }
}