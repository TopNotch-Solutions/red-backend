const express = require('express')
const { verifyAccessToken } = require('../../common/middlewares/authentication')
const { getTips } = require('../../common/controllers/tipsController')
const { cacheMiddleware } = require('../../common/middlewares/cache')

const router = express.Router()

router.get('/tips', verifyAccessToken,cacheMiddleware("tips"), getTips)

module.exports = router
