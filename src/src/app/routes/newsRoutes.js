const express = require('express')
const { verifyAccessToken } = require('../../common/middlewares/authentication')
const { getNews, getNewsById } = require('../controllers/newsController')

const router = express.Router()

router.get('/get-news', verifyAccessToken, getNews)
router.get('/get-news/:id', verifyAccessToken, getNewsById)


module.exports = router