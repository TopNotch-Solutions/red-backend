const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { randomUUID: uuidv4 } = require('crypto')

const DirectChatsModel = sequelize.define('DirectChats', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    chatType: {
        type: DataTypes.ENUM('direct', 'general_inquiry'),
        allowNull: false
    },
    initiatorId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    recipientId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    initiatorType: {
        type: DataTypes.ENUM('app', 'portal'),
        allowNull: false
    },
    recipientType: {
        type: DataTypes.ENUM('app', 'portal'),
        allowNull: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'directChats',
    timestamps: true
});

module.exports = DirectChatsModel