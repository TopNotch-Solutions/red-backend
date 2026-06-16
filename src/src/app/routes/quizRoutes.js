const express = require('express')
const { submitAnswers, getQuizQuestions, getQuizResults, getUserAllQuizResults, getTopQuizResults, getActiveQuizzes } = require('../controllers/quizController')
const { authentication } = require('../../common/middlewares/authentication')

const router = express.Router()

router.post('/submit-answers', authentication, submitAnswers)
router.get('/get-quiz-questions/:quizId', authentication, getQuizQuestions)
router.get('/quiz-results/:quizId', authentication, getQuizResults)
router.get('/all-quizzes-results', authentication, getUserAllQuizResults)
router.get('/top-results/:quizId', authentication, getTopQuizResults)
router.get('/active-quizzes', authentication, getActiveQuizzes)
 
module.exports = router