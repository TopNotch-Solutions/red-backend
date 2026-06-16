const express = require('express')
// const { getInvoicePDF, getInvoicesByAccountNumber } = require('../controllers/invoicesController')
const { authentication } = require('../../common/middlewares/authentication')
const { getInvoicePDF, getInvoicesByAccountNumber, getInvoices, getInvoicesByPeriod } = require('../../common/controllers/invoicesController')

const router = express.Router()

router.get('/invoice/:invoiceId', getInvoicePDF)
router.get('/all-invoices/account/:accountNo', getInvoicesByAccountNumber)
router.post('/retrieve-invoices',  getInvoices)
router.get('/retrieve-invoice/:accountNo/:period', authentication, getInvoicesByPeriod)

module.exports = router