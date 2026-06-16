const express = require('express')
const { verifyAccessToken } = require('../../common/middlewares/authentication')
const { getTips } = require('../../common/controllers/tipsController')

const router = express.Router()

router.get('/tips', verifyAccessToken, getTips)

module.exports = router