const express = require('express')
const { sendMessage, getMessages, respondToMessage } = require('../controllers/contactUsController')
const { verifyAccessToken } = require('../../common/middlewares/authentication')

const router = express.Router()

router.post('/send-message', verifyAccessToken, sendMessage)
router.get('/messages', verifyAccessToken, getMessages)
router.put('/respond/:id', verifyAccessToken, respondToMessage)

module.exports = router