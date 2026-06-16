const express = require('express')
const { verifyAccessToken } = require('../../common/middlewares/authentication')
const { getFiles } = require('../controllers/filesController')

const router = express.Router()

router.get('/all-files', verifyAccessToken, getFiles)

module.exports = router