const express = require('express')
const { authentication } = require('../../common/middlewares/authentication')
const { createMessage } = require('../../common/controllers/messagesController')
const { unreadChatCount } = require('../controllers/messagesController')

const router = express.Router()

router.post('/send-message', authentication, createMessage)
router.post('/unread-chat-count', authentication, unreadChatCount)

module.exports = router 