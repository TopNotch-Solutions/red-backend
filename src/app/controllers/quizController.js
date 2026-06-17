const QuizAnswersModel = require('../models/QuizAnswersModel');
const QuizAttemptModel = require('../models/QuizAttemptModel');
const QuizResultsModel = require('../models/QuizResultsModel')
const { Op } = require('sequelize');
const sequelize = require('../../config/db')
const { QuizModel, QuizQuestionModel, usersModel } = require('../../common/models/associations');
const { isEmpty } = require('../../common/services/isEmpty');

exports.submitAnswers = async (req, res) => {
    const { quizId, answers } = req.body;
    const userId = req.user.id;

    // if (!quizId || !answers || !Array.isArray(answers) || answers.length === 0) {
    //     return res.status(400).json({ status: "FAILURE", message: "Invalid input" });
    // }

    if (!quizId || isEmpty(quizId)) {
        return res.status(400).json({
            status: "FAILED",
            message: "Quiz ID cannot be blank"
        })
    }

    if (!Array.isArray(answers)) {
        return res.status(400).json({
            status: "FAILED",
            message: "Answers must be an array"
        });
    }

    if (!answers || isEmpty(answers)) {
        return res.status(400).json({
            status: "FAILED",
            message: "Answers cannot be blank"
        })
    }

    if (answers.length === 0) {
        return res.status(400).json({
            status: "FAILED",
            message: "Answers array cannot be empty"
        })
    }

    const transaction = await sequelize.transaction();

    try {
        const allQuestions = await QuizQuestionModel.findAll({ where: { quizId } })
        const totalQuestions = allQuestions.length

        if (totalQuestions === 0) {
            await transaction.rollback()
            return res.status(404).json({
                status: 'FAILED',
                message: 'Quiz not found or has no questions'
            })
        }

        const submittedAnswers = new Map(answers.map(a => [a.questionId, a.answer]))

        let correctAnswersCount = 0

        for (const question of allQuestions) {
            const questionId = question.id
            const submittedAnswer = submittedAnswers.get(questionId)

            const answer = submittedAnswer || 'Unanswered'
            const isCorrect = answer !== 'Unanswered' && answer === question.correctAnswer

            if (isCorrect) correctAnswersCount++

            await QuizAnswersModel.upsert({ quizId, questionId, userId, answer, isCorrect }, { transaction })
        }

        await QuizResultsModel.upsert({ quizId, userId, totalQuestions, correctAnswers: correctAnswersCount }, { transaction })

        await transaction.commit()

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Quiz answers submitted successfully',
            totalQuestions,
            correctAnswersCount
        })
    } catch (error) {
        await transaction.rollback();
        console.error("Error submitting answers:", error);
        return res.status(500).json({
            status: 'FAILED',
            message: "Internal server error" + error.message
        });
    }
};

exports.getQuizQuestions = async (req, res) => {
    const { quizId } = req.params;
    const userId = req.user.id;

    if (!quizId || isEmpty(quizId)) {
        return res.status(400).json({
            status: "FAILED",
            message: "Quiz id cannot be blank"
        });
    }

    try {
        if (!quizId || isEmpty(quizId)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Quiz ID cannot be blank'
            })
        }
        if (!userId) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'User ID is required'
            })
        }

        const quiz = await QuizModel.findByPk(quizId)
        if (!quiz) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Quiz not found'
            })
        }

        let attempt = QuizAttemptModel.findOne({
            where: { quizId, userId }
        })

        if (!attempt) {
            attempt = await QuizAttemptModel.create({
                quizId,
                userId,
                starttimie: new Date()
            })
        }

        const questions = await QuizQuestionModel.findAll({
            where: { quizId },
            attributes: ['id', 'question', 'options', 'image', 'correctAnswer']
        })

        if (questions.length === 0) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'No questions found for this quiz'
            })
        }

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Quiz questions retrieved successfully',
            data: {
                questions,
                attempt
            }
        })
    } catch (error) {
        console.error('Error retrieving questions', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.getQuizResults = async (req, res) => {
    const { quizId } = req.params
    const userId = req.user.id

    try {

        if (!quizId || isEmpty(quizId)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Quiz ID cannot be blank'
            })
        }
        const quiz = await QuizModel.findByPk(quizId)

        if (!quiz) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Quiz not found'
            })
        }

        const totalQuestions = await QuizQuestionModel.count({
            where: { quizId }
        })

        const correctAnswers = await QuizAnswersModel.count({
            where: {
                quizId,
                userId,
                isCorrect: true
            }
        })

        const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
        const passed = percentage >= quiz.passing_percentage

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Quiz results retrieved successfully',
            data: {
                totalQuestions,
                correctAnswers,
                percentage: percentage.toFixed(2) + '%',
                passed
            }
        })
    } catch (error) {
        console.error('Error retrieving quiz results:', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.getUserAllQuizResults = async (req, res) => {
    const userId = req.user.id;

    try {
        const quizAnswers = await QuizAnswersModel.findAll({
            where: { userId },
            include: [
                {
                    model: QuizModel,
                    as: 'quiz',
                    include: [
                        {
                            model: QuizQuestionModel,
                            as: 'questions'
                        }
                    ]
                },
                {
                    model: QuizQuestionModel,
                    as: 'question'
                }
            ]
        });
        // const getAllUserWhoCompletedQuiz = await QuizAnswersModel.count({
        //         where: {
        //             quizId: quiz.id
        //         }});

        const quizGroups = quizAnswers.reduce((acc, answer) => {
            const quizId = answer.quizId;
            if (!acc[quizId]) {
                acc[quizId] = {
                    quiz: answer.quiz,
                    answers: []
                };
            }
            acc[quizId].answers.push(answer);
            return acc;
        }, {});

        const results = Object.values(quizGroups).map(group => {
            const quiz = group.quiz;
            if (!quiz) return null;
            
            const totalQuestions = quiz.questions.length;
            const correctAnswers = group.answers.filter(answer => answer.isCorrect).length;
            const percentage = totalQuestions ? (correctAnswers / totalQuestions) * 100 : 0;
            const passed = percentage >= quiz.passing_percentage;

            const questionsWithAnswers = quiz.questions.map(q => {
                const userAnswer = group.answers.find(answer => answer.questionId === q.id);
                return {
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    userAnswer: userAnswer ? userAnswer.answer : null,
                    isCorrect: userAnswer ? userAnswer.isCorrect : false
                };
            });

            

            return {
                quizId: quiz.id,
                title: quiz.title,
                //totalUserCompleted: getAllUserWhoCompletedQuiz,
                description: quiz.description,
                focusArea: quiz.focusArea,
                totalQuestions,
                correctAnswers,
                percentage: percentage.toFixed(2) + '%',
                passed,
                questions: questionsWithAnswers
            };
        }).filter(Boolean);

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Quiz results retrieved successfully',
            data: results
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        });
    }
};

exports.getTopQuizResults = async (req, res) => {
    const { quizId } = req.params;
    try {
        const results = await QuizResultsModel.findAll({
            where: { quizId },
            include: [
                {
                    model: usersModel,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'profileImage']
                }
            ],
            order: [['correctAnswers', 'DESC']],
            attributes: ['quizId', 'userId', 'totalQuestions', 'correctAnswers'],
            limit: 10
        })

        if (!results.length) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'No quiz results found'
            })
        }

        const formattedResults = results.map(result => ({
            quizId: result.quizId,
            userId: result.user.id,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            email: result.user.email,
            cellphoneNumber: result.user.cellphoneNumber,
            profileImage: result.user.profileImage,
            totalQuestions: result.totalQuestions,
            correctAnswers: result.correctAnswers,
            percentage: result.totalQuestions ? ((result.correctAnswers / result.totalQuestions) * 100).toFixed(2) + '%' : '0%'
        }))

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Top quiz results retrieved successfully',
            data: formattedResults
        })
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        });
    }
}

exports.getActiveQuizzes = async (req, res) => {
    try {
        const currentTime = new Date();
        const userId = req.user.id;

        const quizzes = await QuizModel.findAll({
            where: {
                endTime: { [Op.gt]: currentTime },
                [Op.or]: [
                    { startTime: { [Op.is]: null } },
                    { startTime: { [Op.lte]: currentTime } }
                ]
            },
            order: [['startTime', 'ASC']],
            include: [
                {
                    model: QuizQuestionModel,
                    as: 'questions',
                    attributes: []
                }
            ],
            attributes: {
                include: [[sequelize.fn('COUNT', sequelize.col('questions.id')), 'questionCount']]
            },
            group: ['Quiz.id']
        });

        if (quizzes.length === 0) {
            return res.status(200).json({
                status: 'SUCCESS',
                message: 'No active quizzes available',
                quizzes: []
            });
        }

        const attemptedQuizzes = await QuizAnswersModel.findAll({
            where: { userId },
            attributes: ['quizId'],
            group: ['quizId']
        });
        const attemptedQuizIds = attemptedQuizzes.map(q => q.quizId);

        const formattedQuizzes = quizzes.map(quiz => ({
            ...quiz.dataValues,
            status: attemptedQuizIds.includes(quiz.id) ? "Attempted" : "Not Attempted"
        }));

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Active quizzes retrieved successfully',
            quizzes: formattedQuizzes
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        });
    }
};