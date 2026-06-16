const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const QuizModel = require('../../portal/models/QuizModel')
const { v4: uuidv4 } = require('uuid')

const QuizQuestionModel = sequelize.define('QuizQuestion', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    quizId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: QuizModel,
            key: 'id'
        },
        onDelete: false
    },
    question: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    options: {
        type: DataTypes.JSON,
        allowNull: false
    },
    correctAnswer: {
        type: DataTypes.STRING,
        allowNull: false
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'quiz_questions',
    timestamps: false
})

module.exports = QuizQuestionModel