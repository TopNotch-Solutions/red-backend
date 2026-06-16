const express = require('express')
const { survey, submit } = require('../controllers/surveyController');
const { authentication } = require('../../common/middlewares/authentication');
const router = express.Router()
router.post('/survey/:id/responses', authentication, submit);
router.get('/surveys', authentication, survey);

module.exports = router