const usersModel = require('../../common/models/usersModel')
const ElectricianNotificationModel = require('../models/ElectricianNotificationModel')

exports.getAllNotifications = async (req, res) => {
    const electricianId = req.user.id;

    try {
        const user = await usersModel.findByPk(electricianId)
        if (user.role == 'AppUser') {
            return res.status(404).json({
                message: 'User not found'
            })
        }

        const electrician = await usersModel.findOne({
            where: {
                id: electricianId
            }
        })

        if (!electrician) {
            return res.status(404).json({
                status: 404,
                message: 'User not found'
            })
        }

        const notifications = await ElectricianNotificationModel.findAll({
            where: { electricianId },
            order: [['createdAt', 'DESC']]
        })

        res.status(200).json({
            status: 200,
            message: 'User notifications retrieved successfully',
            notifications: notifications
        })
    } catch (error) {
        console.error('Error retrieving notifications:', error)
        res.status(500).json({
            status: 500,
            message: 'Internal server error' + error.message
        })
    }
}

exports.getNotificationCount = async (req, res) => {
    const electricianId = req.user.id;

    try {
        const notificationCount = await ElectricianNotificationModel.count({
            where: {
                electricianId: electricianId,
                isread: 0
            }
        })

        res.status(200).json({
            status: 200,
            message: 'Notification count successfully retrieved',
            count: notificationCount
        })
    } catch (error) {
        console.error('Error retrieving notification count:', error)
        res.status(500).json({
            status: 500,
            message: 'Internal server error' + error.message
        })
    }
}

exports.markNotificationAsRead = async (req, res) => {
    const { notificationId } = req.params;
    const electricianId = req.user.id;

    try {
        const notification = await ElectricianNotificationModel.findOne({
            where: {
                electricianId: electricianId,
                id: notificationId
            }
        })

        if (!notification) {
            return res.status(404).json({
                status: 404,
                message: 'Notification not found'
            })
        }

        notification.isread = 1
        await notification.save()

        res.status(200).json({
            status: 200,
            message: 'Notification marked as read successfully'
        })
    } catch (error) {
        console.error('Error marking notification as read:', error)
        res.status(500).json({
            status: 500,
            message: 'Internal server error' + error.message
        })
    }
}

exports.deleteNotification = async (req, res) => {
    const { notificationId } = req.params;
    const electricianId = req.user.id;

    try {
        const notification = await ElectricianNotificationModel.findOne({
            where: {
                id: notificationId,
                electricianId: electricianId
            }
        })

        if (!notification) {
            return res.status(404).json({
                status: 404,
                message: 'Notification not found'
            })
        }

        await notification.destroy()

        res.status(200).json({
            status: 200,
            message: 'Notification deleted successfully'
        })
    } catch (error) {
        console.error('An error occurred:', error)
        res.status(500).json({
            status: 500,
            message: 'Internal server error' + error.message
        })
    }
}
