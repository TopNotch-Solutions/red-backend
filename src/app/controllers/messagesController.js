const MessagesModel = require("../../common/models/messagesModel.js")
const sequelize = require("../../config/db.js")
const UserNotifications = require("../../common/models/UsersNotificationModel.js")
const NotificationsModel = require("../../portal/models/NotificationsModel.js")
const { Op } = require("sequelize")


exports.unreadChatCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { userType } = req.body;

        if (!userType) {
            return res.status(400).json({
                success: false,
                error: 'userType query parameter is required (app or portal)'
            });
        }

        const unreadConversations = await MessagesModel.findAll({
            attributes: [
                [sequelize.fn('DISTINCT', sequelize.col('conversationId')), 'conversationId']
            ],
            where: {
                receiverId: userId,
                receiverType: userType,
                isRead: false,
                conversationId: { [Op.not]: null }
            },
            raw: true
        });

        const unreadIssueChats = await MessagesModel.findAll({
            attributes: [
                [sequelize.fn('DISTINCT', sequelize.col('issueId')), 'issueId']
            ],
            where: {
                receiverId: userId,
                receiverType: userType,
                isRead: false,
                conversationId: null,
                issueId: { [Op.not]: null }
            },
            raw: true
        });

        const unreadMadeForYouNotification = await UserNotifications.findOne({
            include: [{
                model: NotificationsModel,
                where: { notificationType: 'MadeForYou' },
                required: true
            }],
            where: {
                userId: userId,
                isRead: false
            }
        });

        const unreadMadeForYouNotifications = unreadMadeForYouNotification ? 1 : 0;

        const totalUnreadChats = unreadConversations.length + unreadIssueChats.length + unreadMadeForYouNotifications;

        res.status(200).json({
            success: 'SUCCESS',
            data: {
                unreadChatCount: totalUnreadChats,
                unreadConversations: unreadConversations.length,
                unreadIssueChats: unreadIssueChats.length,
                unreadMadeForYouNotifications: unreadMadeForYouNotifications
            }
        });

    } catch (error) {
        console.error('Error getting unread chat count:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve unread chat count'
        });
    }
}