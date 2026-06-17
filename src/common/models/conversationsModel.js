const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db')
const { randomUUID: uuidv4 } = require('crypto');
const MessagesModel = require('./messagesModel');

const ConversationsModel = sequelize.define('Conversations', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('direct', 'broadcast'),
        allowNull: false,
        defaultValue: 'direct'
    },
    participant1Id: {
        type: DataTypes.UUID,
        allowNull: true
    },
    participant2Id: {
        type: DataTypes.UUID,
        allowNull: true
    },
    broadcasterId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    participant1Type: {
        type: DataTypes.ENUM('app', 'portal'),
        allowNull: true
    },
    participant2Type: {
        type: DataTypes.ENUM('app', 'portal'),
        allowNull: true
    },
    broadcasterType: {
        type: DataTypes.ENUM('app', 'portal'),
        allowNull: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'conversations',
    timestamps: true
});

ConversationsModel.hasMany(MessagesModel, { foreignKey: 'conversationId' })
MessagesModel.belongsTo(ConversationsModel, { foreignKey: 'conversationId' })

module.exports = ConversationsModel