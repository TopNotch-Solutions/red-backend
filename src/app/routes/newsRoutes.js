const express = require('express')
const { verifyAccessToken } = require('../../common/middlewares/authentication')
const { getNews, getNewsById } = require('../controllers/newsController')
const { cacheMiddleware } = require('../../common/middlewares/cache')

const router = express.Router()

router.get('/get-news', verifyAccessToken,cacheMiddleware("news"), getNews)
router.get('/get-news/:id', verifyAccessToken, getNewsById)


module.exports = router
