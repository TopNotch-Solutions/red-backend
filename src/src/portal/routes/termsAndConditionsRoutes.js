const express = require('express')
const { createTermsAndConditions, getTermsAndConditions, updateTermsAndConditions, deleteTermsAndConditions } = require('../controllers/termsAndConditionsController');
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { checkRole } = require('../../common/middlewares/authorization')

const router = express.Router()

router.post('/terms', portalAuthentication, checkRole('admin'), createTermsAndConditions)
router.get('/terms', getTermsAndConditions)
router.put('/terms/:id', portalAuthentication, checkRole('admin'), updateTermsAndConditions)
router.delete('/terms/:id',portalAuthentication, checkRole('admin'), deleteTermsAndConditions)

module.exports = router