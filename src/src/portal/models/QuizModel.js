const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { randomUUID: uuidv4 } = require('crypto')
const usersModel = require('../../common/models/usersModel')

const QuizModel = sequelize.define('Quiz', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 30
    },
    focusArea: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    passing_percentage: {
        type: DataTypes.INTEGER,
        defaultValue: 50
    },
        isPrizeQuiz: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        winnerId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: usersModel,
            key: 'id'
        },
    }
}, {
    tableName: 'quiz',
    timestamps: false
})

module.exports = QuizModel