const QuizAnswersModel = require('../models/QuizAnswersModel')
const QuizResultsModel = require('../models/QuizResultsModel')
const QuizQuestionModel = require('../../common/models/QuizQuestionModel')

exports.processQuizCompletion = async ({ quizId, userId }) => {
    try {
        const totalQuestions = await QuizQuestionModel.count({ where: { quizId } })
        const answeredCount = await QuizAnswersModel.count({ where: { quizId, userId } })

        if (answeredCount < totalQuestions) {
            return "answer all questions"
        }

        const correctAnswers = await QuizAnswersModel.count({
            where: { quizId, userId, isCorrect: true }
        })

        await QuizResultsModel.upsert({
            quizId,
            userId,
            totalQuestions,
            correctAnswers
        })

        console.log(`Quiz ${quizId} completed for user ${userId}`)
    } catch (error) {
        console.error('Error processing quiz completion:', error)
    }
}