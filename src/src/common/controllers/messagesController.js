const User = require("../../portal/models/UserModel")
const IssuesModel = require("../models/issuesModel")
const usersModel = require("../models/usersModel")

exports.createMessage = async (req, res) => {
    try {
        const { issueId, senderId, receiverId, senderType, receiverType, message } = req.body

        if (!['app', 'portal'].includes(senderType) || !['app', 'portal'].includes(receiverType)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Invalid sender or receiver type'
            })
        }

        const issue = await IssuesModel.findByPk(issueId)

        if (!issue) return res.status(404).json({
            status: 'FAILED',
            message: 'Issue not found'
        })

        const sender = senderType === 'app' ? await usersModel.findByPk(receiverId) : await User.findByPk(senderId)
        const receiver = senderType === 'app' ? await User.findByPk(receiverId) : await usersModel.findByPk(receiverId)

        if (!sender || !receiver) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Sender or receiver not found'
            })
        }

        const messageData = {
            issueId,
            senderId, 
            receiverId,
            senderType,
            receiverType,
            message
        }

        res.status(201).json({
            status: 'SUCCESS',
            message: 'Message created successfully',
            data: messageData
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error'
        })
    }
}

exports.markMessageAsRead = async (req, res) => {
    try {
        const { messageId } = req.params

        const message = await MessagesModel.findByPk(messageId)

        if (!message) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Message not found'
            })
        }

        message.isRead = true
        await message.save()

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Message marked as read successfully'
        })
    } catch(error) {
        console.error(error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error'
        })
    }
}

exports.getUnreadMessagesCount = async (req, res) => {
    try {
        const { userId, userType } = req.params

        const messages = await MessagesModel.findAll({
            where: {
                receiverId: userId,
                receiverType: userType,
                isRead: false
            }
        })

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Unread messages count retrieved successfully',
            data: messages.length
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error'
        })
    }
}