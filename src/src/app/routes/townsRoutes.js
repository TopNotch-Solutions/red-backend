const express = require('express')
const { getTowns } = require('../../common/controllers/townsController')
const { verifyAccessToken } = require('../../common/middlewares/authentication')

const router = express.Router()

router.get('/get-towns', verifyAccessToken, getTowns)

module.exports = router