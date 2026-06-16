const express = require('express')
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { getAppUsers, customersPerTown } = require('../controllers/appUsersController')

const router = express.Router()

router.get('/all-users', portalAuthentication, getAppUsers)
router.get('/customers-per-town', portalAuthentication, customersPerTown)

module.exports = router