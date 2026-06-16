const express = require('express')
const { createIssue, updateIssue, deleteIssue, reportingHistory, deleteIssueImages, getRolesWithCategories, appIssues } = require('../controllers/issuesController')
const { upload } = require('../middlewares/uploadMiddleware')
const { authentication } = require('../../common/middlewares/authentication')

const router = express.Router()

router.post('/report-issue', authentication, upload.array('issueImage', 3), createIssue)
router.put('/update-issue/:id', authentication, upload.array('issueImage', 3), updateIssue)
router.delete('/delete-issue/:id', authentication, deleteIssue)
router.get('/reporting-history', authentication, reportingHistory)
router.get('/retrieve-all-role-with-categories', authentication, getRolesWithCategories)
router.delete('/delete-issue-images', authentication, deleteIssueImages)
router.post('/app-issues', authentication, appIssues);

module.exports = router
