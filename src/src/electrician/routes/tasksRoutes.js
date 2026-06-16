const express = require('express')
const { electricianAuthentication } = require('../../common/middlewares/authentication')
const { upload } = require('../../app/middlewares/uploadMiddleware')
const { getIssuesByElectrician, changeTaskStatus, getTaskStats, getUnassignedTasks, acceptTask, createTask, updateTask, deleteTask,completedStatusTask } = require('../controllers/tasksController')
const {uploadMultipleDocuments } = require('../../app/middlewares/uploadCompletedImage')

const router = express.Router()

router.get('/electrician-tasks', electricianAuthentication, getIssuesByElectrician)
router.patch('/change-task-status/:issueId', electricianAuthentication,uploadMultipleDocuments, changeTaskStatus)
router.get('/task-stats', electricianAuthentication, getTaskStats)
router.get('/unassigned-tasks', electricianAuthentication, getUnassignedTasks)
router.put('/accept-task/:issueId', electricianAuthentication, acceptTask)
router.post('/create-task', electricianAuthentication, upload.array('issueImage'), createTask)
router.put('/update-task/:id',electricianAuthentication,upload.array('issueImage'), updateTask)
router.delete('/delete-task/:id',electricianAuthentication, deleteTask);
router.put('/chnage-task-completed-status/:id',electricianAuthentication, completedStatusTask);

module.exports = router