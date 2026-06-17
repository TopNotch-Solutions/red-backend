const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const QuizModel = require('../../portal/models/QuizModel')
const { randomUUID: uuidv4 } = require('crypto')

const QuizResultsModel = sequelize.define('QuizResults', {
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
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    totalQuestions: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    correctAnswers: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'quiz_results',
    timestamps: false
})

QuizModel.hasMany(QuizResultsModel, { foreignKey: 'quizId' })
QuizResultsModel.belongsTo(QuizModel, { foreignKey: 'quizId' })

module.exports = QuizResultsModel