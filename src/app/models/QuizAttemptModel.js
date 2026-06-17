const {DataTypes} = require('sequelize')
const sequelize = require('../../config/db')
const QuizModel = require('../../portal/models/QuizModel')
const usersModel = require('../../common/models/usersModel')
const { randomUUID: uuidv4 } = require('crypto')

const QuizAttemptModel = sequelize.define('QuizAttempts', {
    id:{
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true
    },
    quizId: {
        type: DataTypes.UUID,
        allowNull: false,
        references:{
            model: QuizModel,
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
    starttime: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    tableName: 'quiz_attempt',
    timestamps: false
})

module.exports = QuizAttemptModel