const {DataTypes} = require('sequelize')
const sequelize = require('../../config/db')
const QuizModel = require('../../portal/models/QuizModel')
const usersModel = require('../../common/models/usersModel')
const { v4: uuidv4 } = require('uuid')

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