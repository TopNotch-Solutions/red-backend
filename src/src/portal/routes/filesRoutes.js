const express = require('express')
const { uploadForm } = require('../middlewares/uploadMiddleware')
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { uploadFile, deleteFile, updateFile } = require('../controllers/filesController')
const { getFiles } = require('../../common/controllers/filesController')

const router = express.Router()

router.get('/files', portalAuthentication, getFiles)
router.post('/upload-file', portalAuthentication, uploadForm.single('file'), uploadFile)
router.delete('/delete-file', portalAuthentication, deleteFile)
router.put('/update-file/:id', portalAuthentication, updateFile)

module.exports = router 