const express = require('express')
const { createElectrician, getAllElectricians, getElectricianById, deleteElectrician, updateElectrician, assignIssueToElectrician, unassignIssue,createRole, allRoles, createRoleCategory, getRolesWithCategories } = require('../controllers/electricianController')
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { upload } = require('../../electrician/middleware/uploadMiddleware')
const { checkRole } = require('../../common/middlewares/authorization')


const router = express.Router()

router.post('/create-electrician', portalAuthentication, checkRole('admin'), upload.single('profileImage'), createElectrician)
router.post('/create-role', portalAuthentication, checkRole('admin'), createRole);
router.post('/create-role-category', portalAuthentication, checkRole('admin'), createRoleCategory);
router.get('/retrieve-all-role', portalAuthentication, checkRole('admin'),allRoles);
router.get('/retrieve-all-role-with-categories', portalAuthentication, checkRole('admin'),getRolesWithCategories);
router.get('/all-electricians', portalAuthentication, getAllElectricians)
router.get('/one-electrician/:userId', portalAuthentication, getElectricianById)
router.delete('/delete-electrician', portalAuthentication, checkRole('admin'), deleteElectrician)
router.put('/update-electrician/:userId', portalAuthentication, checkRole('admin'), upload.single('profileImage'), updateElectrician)
router.post('/assign-task-to-electrician', portalAuthentication, assignIssueToElectrician)
router.patch('/unassign-task/:issueId', portalAuthentication, unassignIssue)

module.exports = router
