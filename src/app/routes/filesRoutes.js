const express = require('express')
const { verifyAccessToken } = require('../../common/middlewares/authentication')
const { getFiles } = require('../controllers/filesController')
const { cacheMiddleware } = require('../../common/middlewares/cache')

const router = express.Router()

router.get('/all-files', verifyAccessToken,cacheMiddleware("files"), getFiles)

module.exports = router
