const NewsModel = require('../../common/models/newsModel')
const admin = require('../../common/services/firebase')
const FcmTokensModel = require('../../common/models/fcmTokensModel')
const { isEmpty } = require('../../common/services/isEmpty')
const { Op } = require('sequelize')
const sequelize = require('../../config/db')
const NotificationsModel = require('../models/NotificationsModel')
const UserNotifications = require('../../common/models/UsersNotificationModel')
const usersModel = require('../../common/models/usersModel')

exports.createNews = async (req, res) => {
    const { title, content } = req.body;
    const uploadedFilePath = req.file ? req.file.path : null;

    const t = await sequelize.transaction();

    try {
        if (!title || isEmpty(title)) {
            if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
                await fsp.unlink(uploadedFilePath);
            }
            await t.rollback();
            return res.status(400).json({
                status: 'FAILED',
                message: 'Title cannot be blank'
            });
        }

        if (!content || isEmpty(content)) {
            if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
                await fsp.unlink(uploadedFilePath);
            }
            await t.rollback();
            return res.status(400).json({
                status: 'FAILED',
                message: 'Content is required'
            });
        }

        const imageUrl = uploadedFilePath ? uploadedFilePath.replace('public', '') : null;

        const news = await NewsModel.create({ title, content, imageUrl }, { transaction: t });

        const newNotification = await NotificationsModel.create({
            title: "New News Article",
            message: `A new article, '${title}', has been published.`,
            notificationType: 'News',
            image: imageUrl
        }, { transaction: t });

        const allUsers = await usersModel.findAll({
            attributes: ['id'],
            transaction: t
        });
        const userIds = allUsers.map(user => user.id);

        const userNotificationsData = userIds.map(id => ({
            userId: id,
            notificationId: newNotification.id,
            isRead: false,
            createdAt: new Date(),
            notificationType: 'News'
        }));

        await UserNotifications.bulkCreate(userNotificationsData, { transaction: t });

        await t.commit();

        const fcmTokensWithUsers = await FcmTokensModel.findAll({
            attributes: ['fcmToken']
        });

        const fcmTokens = fcmTokensWithUsers.map(tokenRecord => tokenRecord.fcmToken);

        if (fcmTokens.length > 0) {
            const message = {
                notification: {
                    title: "New News Article!",
                    body: title
                },
                data: {
                    newsId: news.id.toString(),
                    navigationId: 'NewsStory'
                },
                tokens: fcmTokens
            };
            try {
                const response = await admin.messaging().sendEachForMulticast(message);
                console.log(`${response.successCount} push notifications sent successfully`);
            } catch (error) {
                console.error('Error sending notification', error);
            }
        }

        res.status(201).json({
            status: 'SUCCESS',
            message: 'News and notifications created successfully',
            news
        });
    } catch (error) {
        await t.rollback();
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            try {
                await fsp.unlink(uploadedFilePath);
                console.log(`Cleaned up file: ${uploadedFilePath}`);
            } catch (unlinkError) {
                console.error(`Failed to delete file: ${uploadedFilePath}`, unlinkError);
            }
        }

        console.error('Error creating news', error);
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        });
    }
};


exports.updateNews = async (req, res) => {
    try {
        const { id } = req.params
        const { title, content } = req.body
        const imageUrl = req.file ? req.file.path : null

        const news = await NewsModel.findByPk(id)

        if (!news) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'News not found'
            })
        }

        news.title = title || news.title
        news.content = content || news.content
        if (imageUrl) news.imageUrl = imageUrl

        await news.save()

        res.status(200).json({
            status: 'SUCCESS',
            message: 'News updated successfully',
            news
        })
    } catch (error) {
        console.error('Error updating news', error)
        res.status(500).json({
            status: 'FAILED',
            message: error.message
        })
    }
}

exports.getNews = async (req, res) => {
    try {
        const news = await NewsModel.findAll()
        res.status(200).json({
            status: 'SUCCESS',
            message: 'News fetched successfully',
            news
        })
    } catch (error) {
        console.error('Error fetching news', error)
        res.status(500).json({
            status: 'FAILED',
            message: error.message
        })
    }
}

exports.getNewsById = async (req, res) => {
    try {
        const { id } = req.params
        const news = await NewsModel.findByPk(id)

        if (!news) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'News not found'
            })
        }

        res.status(200).json({
            status: 'SUCCESS',
            message: 'News fetched successfully',
            news
        })
    } catch (error) {
        console.error('Error fetching news', error)
        res.status(500).json({
            status: 'FAILED',
            message: error.message
        })
    }
}

exports.deleteNews = async (req, res) => {
    const { newsIds } = req.body;

    if (!newsIds || !Array.isArray(newsIds) || newsIds.length === 0) {
        return res.status(400).json({
            status: "FAILED",
            message: "News IDs must be a non-empty array."
        });
    }

    try {
        const deletedCount = await NewsModel.destroy({
            where: {
                id: {
                    [Op.in]: newsIds
                }
            }
        });

        if (deletedCount === 0) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'No news articles found with the provided IDs'
            });
        }

        res.status(200).json({
            status: 'SUCCESS',
            message: `${deletedCount} news article(s) deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting news', error);
        res.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};