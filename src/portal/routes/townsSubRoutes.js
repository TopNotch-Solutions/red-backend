const express = require('express')
const { getTowns, getSuburbs } = require('../controllers/townsSubController')
const { portalAuthentication } = require('../../common/middlewares/authentication')

const router = express.Router()

router.get('/get-towns', portalAuthentication, getTowns)
router.get('/get-suburbs/:townId', portalAuthentication, getSuburbs)

module.exports = router