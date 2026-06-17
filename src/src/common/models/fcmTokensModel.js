const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const usersModel = require('./usersModel')
const { randomUUID: uuidv4 } = require('crypto')

const FcmTokensModel = sequelize.define('FcmTokens', {
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
    fcmToken: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'fcmTokens',
    timestamps: true
})

usersModel.hasMany(FcmTokensModel, {
    foreignKey: 'userId',
    as: 'fcmTokens'
})

module.exports = FcmTokensModel