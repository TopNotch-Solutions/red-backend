const express = require('express')
// const { getInvoicePDF, getInvoicesByAccountNumber } = require('../controllers/invoicesController')
// const { authentication } = require('../../common/middlewares/authentication')
const { getInvoicePDF, getInvoicesByAccountNumber, getInvoices } = require('../../common/controllers/invoicesController')
const { portalAuthentication } = require('../../common/middlewares/authentication')

const router = express.Router()

router.get('/invoice/:invoiceId', getInvoicePDF)
router.get('/all-invoices/account/:accountNo', getInvoicesByAccountNumber)
router.get('/retrieve-invoices/:accountNo', portalAuthentication, getInvoices)

module.exports = router