const express = require('express')
const { getTowns } = require('../../common/controllers/townsController')
const { verifyAccessToken } = require('../../common/middlewares/authentication')
const { cacheMiddleware } = require('../../common/middlewares/cache')

const router = express.Router()

router.get('/get-towns', verifyAccessToken,cacheMiddleware("towns"), getTowns)

module.exports = router
