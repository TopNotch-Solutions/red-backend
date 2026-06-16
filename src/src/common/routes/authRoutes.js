const express = require('express')
const authentication = require('../middlewares/authentication')
const { login } = require('../controllers/authController')

const router = express.Router()

router.post('/login', authentication, login)

module.exports = router