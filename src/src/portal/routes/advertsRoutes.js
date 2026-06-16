const express = require('express')
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { createAdvert, getAdverts, getAdvertById, updateAdvert, deleteAdvert } = require('../controllers/advertsController')
const { uploadAdvertsImage } = require('../middlewares/uploadMiddleware')

const router = express.Router()

router.post('/create-advert', portalAuthentication, uploadAdvertsImage.single('image'), createAdvert)
router.get('/get-adverts', portalAuthentication, getAdverts)
router.get('/get-adverts/:id', portalAuthentication, getAdvertById)
router.put('/update-advert/:id', portalAuthentication, uploadAdvertsImage.single('image'), updateAdvert)
router.delete('/delete-advert', portalAuthentication, deleteAdvert)

module.exports = router