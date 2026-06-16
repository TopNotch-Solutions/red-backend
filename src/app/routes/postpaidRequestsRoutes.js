const express = require('express')
const { authentication } = require('../../common/middlewares/authentication')
const { accountBalanceDetails, accountBalance, accountPaymentHistory, accounts, accountDetails, meters, consumption } = require('../controllers/postpaidRequestsController')

const router = express.Router()

router.post('/account-balance-details', authentication, accountBalanceDetails)
router.post('/account-balance', authentication, accountBalance)
router.post('/payment-history', authentication, accountPaymentHistory)
router.post('/accounts', accounts)
router.post('/account-details', accountDetails)
router.post('/meters', authentication, meters)
router.post('/consumption', authentication, consumption)


module.exports = router