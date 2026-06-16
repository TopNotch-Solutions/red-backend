const express = require('express')
const { verifyAccessToken } = require('../../common/middlewares/authentication')
const { getSuburbs } = require('../controllers/suburbsController')
const { cacheMiddleware } = require('../../common/middlewares/cache')

const router = express.Router()

router.get('/get-suburbs/:townId', verifyAccessToken, getSuburbs)

module.exports = router
