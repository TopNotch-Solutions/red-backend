const express = require('express')
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { createTown, updateTown, deleteTown } = require('../controllers/townsController')
const { getTowns } = require('../../common/controllers/townsController')

const router = express.Router()

router.post('/add-town', portalAuthentication, createTown)
router.put('/update-town/:townId', portalAuthentication, updateTown)
router.get('/get-towns', portalAuthentication, getTowns)
router.delete('/delete-town', portalAuthentication, deleteTown)

module.exports = router