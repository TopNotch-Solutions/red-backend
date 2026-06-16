const express = require('express')
const { portalAuthentication } = require('../../common/middlewares/authentication')
const { create, survey, removeSurveys, allSurveys } = require('../controllers/surveyController')
const router = express.Router()
router.post('/create-survey', portalAuthentication, create);
router.get('/surveys', portalAuthentication, allSurveys);
router.get('/surveys/:id/results', portalAuthentication, survey);
router.delete('/surveys', portalAuthentication, removeSurveys);

module.exports = router