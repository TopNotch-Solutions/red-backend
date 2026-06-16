const express = require('express')
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { createNews, updateNews, getNews, getNewsById, deleteNews } = require('../controllers/newsController')
const { uploadAdvertsImage, uploadNewsImage } = require('../middlewares/uploadMiddleware')

const router = express.Router()

router.post('/create-news', portalAuthentication, uploadAdvertsImage.single('imageUrl'), createNews)
router.put('/update-news/:id', portalAuthentication, uploadNewsImage.single('imageUrl'), updateNews)
router.get('/get-news', portalAuthentication, getNews)
router.get('/get-news/:id', portalAuthentication, getNewsById)
router.delete('/delete-news', portalAuthentication, deleteNews)

module.exports = router