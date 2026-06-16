const express = require('express')
const { portalAuthentication } = require('../../common/middlewares/authentication')
const {getMeterReadings} = require('../controllers/meterReadingController')

const router = express.Router()

router.get('/meter-readings', portalAuthentication, getMeterReadings)

module.exports = router