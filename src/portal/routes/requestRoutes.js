const express = require('express')
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { generateAuth } = require('../controllers/requestsController')

const router = express.Router()

router.get('/generate-auth-token', portalAuthentication, generateAuth)

module.exports = router