const express = require('express')
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { getMessages, respondToMessage, markAsCompleted } = require('../controllers/contactUsController')

const router = express.Router()

router.get('/messages', portalAuthentication, getMessages)
router.put('/respond/:id', portalAuthentication, respondToMessage)
router.put('/mark-as-completed/:id', portalAuthentication, markAsCompleted)

module.exports = router