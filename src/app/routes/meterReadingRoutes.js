const express = require('express')
const { authentication } = require('../../common/middlewares/authentication')
const { insertMeterReading } = require('../controllers/meterReadingsController')

const router = express.Router()

router.post('/add-meter-reading', authentication, insertMeterReading)

module.exports = router