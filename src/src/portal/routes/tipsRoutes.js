const express = require('express')
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { createTips, deleteTips, updateTips, deleteSingleTip, addSingleTip, deleteTipImage } = require('../controllers/tipsController')
const { uploadTipsImage } = require('../middlewares/uploadMiddleware')
const { getTips } = require('../../common/controllers/tipsController')

const router = express.Router()

router.post('/create-tips', portalAuthentication, uploadTipsImage.single('image'), createTips)
router.get('/tips', portalAuthentication, getTips)
router.delete('/delete-tip', portalAuthentication, deleteTips)
router.put('/update-tips/:tipId', uploadTipsImage.single('image'), portalAuthentication, updateTips)
router.delete('/delete-single-tip/:tipId', portalAuthentication, deleteSingleTip)
router.post('/add-single-tip/:tipId', portalAuthentication, addSingleTip)
router.delete('/delete-tip-image/:tipId', portalAuthentication, deleteTipImage)

module.exports = router