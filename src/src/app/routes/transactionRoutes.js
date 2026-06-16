const express = require('express')
const { authentication } = require('../../common/middlewares/authentication')
const { createTransaction, transactionHistory, verifyPin, resetPin, createPayment, getPendingPayments, nextPayment, getReceipt } = require('../controllers/transactionsController')

const router = express.Router()

router.post('/create-transaction', authentication, createTransaction)
router.get('/transaction-history', authentication, transactionHistory)
router.post('/verify-pin', authentication, verifyPin)
router.patch('/reset-pin', authentication, resetPin)
router.post('/create-payment', authentication, createPayment)
router.get('/pending-payments', authentication, getPendingPayments)
router.post('/next-payment', authentication, nextPayment)
router.get('/receipt', authentication, getReceipt)

module.exports = router
