const express = require('express')
const { createElectrician, getAllElectricians, getElectricianById, deleteElectrician, updateElectrician, assignIssueToElectrician, unassignIssue } = require('../controllers/electricianController')
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { upload } = require('../../electrician/middleware/uploadMiddleware')
const { checkRole } = require('../../common/middlewares/authorization')


const router = express.Router()

router.post('/create-electrician', portalAuthentication, checkRole('admin'), upload.single('profileImage'), createElectrician)
router.get('/all-electricians', portalAuthentication, getAllElectricians)
router.get('/one-electrician/:userId', portalAuthentication, getElectricianById)
router.delete('/delete-electrician', portalAuthentication, checkRole('admin'), deleteElectrician)
router.put('/update-electrician/:userId', portalAuthentication, checkRole('admin'), upload.single('profileImage'), updateElectrician)
router.post('/assign-task-to-electrician', portalAuthentication, assignIssueToElectrician)
router.patch('/unassign-task/:issueId', portalAuthentication, unassignIssue)

module.exports = router