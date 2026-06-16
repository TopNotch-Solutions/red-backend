const express = require('express')
const { getAllIssues, issueStats, getDashboardStatistics } = require('../controllers/issuesController')
const { portalAuthentication } = require('../../common/middlewares/authentication')

const router = express.Router()

router.get('/get-all-issues', portalAuthentication, getAllIssues)
router.get('/issue-stats',portalAuthentication, issueStats)
router.get("/dashboard/statistics", portalAuthentication, getDashboardStatistics);

module.exports = router
