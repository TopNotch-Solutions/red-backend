const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const QuizModel = require('../../portal/models/QuizModel')
const QuizQuestionModel = require('../../common/models/QuizQuestionModel')
const usersModel = require('../../common/models/usersModel')
const { randomUUID: uuidv4 } = require('crypto')

const QuizAnswersModel = sequelize.define('QuizAnswer', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true
    },
    quizId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: QuizModel,
            key: 'id'
        }
    },
    questionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: QuizQuestionModel,
            key: 'id'
        }
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: usersModel,
            key: 'id'
        }
    },
    answer: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isCorrect: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    }
}, {
    tableName: 'quiz_answers',
    timestamps: false
})

module.exports = QuizAnswersModel