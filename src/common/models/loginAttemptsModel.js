const sequelize = require('../../config/db')
const { DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const usersModel = require('./usersModel')

const LoginAttemptsModel = sequelize.define('LoginAttempt', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: usersModel,
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    lastAttempt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    isBlocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timeStamps: true,
    tableName: 'login_attempts'
})

module.exports = LoginAttemptsModel