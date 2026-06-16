const express = require('express')
const { authentication, portalAuthentication } = require('../../common/middlewares/authentication')
const { transactions, transactionByUser, transactionStats, getPendingPayments, completePayment, getTransactionStatisticsByLocation } = require('../controllers/transactionsController')

const router = express.Router()

router.get('/all-transactions', portalAuthentication, transactions)
router.get('/transaction-by-user/:userId', portalAuthentication, transactionByUser)
router.get('/transaction-stats', portalAuthentication, transactionStats)
router.get('/pending-payments', portalAuthentication, getPendingPayments)
router.patch('/complete-payment/:paymentId', portalAuthentication, completePayment)
router.get('/statistics/location', portalAuthentication, getTransactionStatisticsByLocation);

module.exports = router
