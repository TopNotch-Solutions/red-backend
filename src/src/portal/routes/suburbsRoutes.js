const express = require('express')
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { createSuburb, updateSuburb, deleteSuburb } = require('../controllers/suburbsController')
const { getSuburbs } = require('../../common/controllers/suburbsController')


const router = express.Router()

router.get('/get-suburbs', portalAuthentication, getSuburbs)
router.post('/add-suburb', portalAuthentication, createSuburb)
router.put('/update-suburb/:suburbId', portalAuthentication, updateSuburb)
router.delete('/delete-suburb', portalAuthentication, deleteSuburb)

module.exports = router