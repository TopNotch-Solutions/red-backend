const express = require('express')
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { createMessage } = require('../../common/controllers/messagesController')

const router = express.Router()

router.post('/send-message', portalAuthentication, createMessage)

module.exports = router