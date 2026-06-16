const express = require('express')
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { getPayments } = require('../controllers/paymentsController')
const { completePayment } = require('../controllers/transactionsController')

const router = express.Router()

router.get('/get-payments', portalAuthentication, getPayments)

module.exports = router