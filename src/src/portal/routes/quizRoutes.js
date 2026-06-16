const express = require('express')
const { createQuiz, quizStats, editQuiz, updateQuizQuestions, deleteQuiz, getQuiz, getQuizzes, getTopQuizUsers } = require('../controllers/quizController')
const { uploadQuizImage } = require('../middlewares/uploadMiddleware')
const { portalAuthentication } = require('../../common/middlewares/authentication')

const router = express.Router()

router.post('/create-quiz', portalAuthentication, uploadQuizImage, createQuiz)
router.get('/quiz-stats/:quizId', portalAuthentication, quizStats)
router.put('/edit-quiz/:quizId', portalAuthentication, editQuiz)
router.put('/update-quiz-questions', portalAuthentication, updateQuizQuestions)
router.delete('/delete-quiz', portalAuthentication, deleteQuiz)
router.get('/quiz/:quizId', portalAuthentication, getQuiz)
router.get('/quizzes', portalAuthentication, getQuizzes)
router.get('/top-quiz-users', portalAuthentication, getTopQuizUsers)

module.exports = router