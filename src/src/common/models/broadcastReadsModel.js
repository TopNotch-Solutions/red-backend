const sequelize = require('../../config/db')
const { DataTypes } = require('sequelize')
const { randomUUID: uuidv4 } = require('crypto')
const MessagesModel = require('./messagesModel')
const usersModel = require('./usersModel')

const BroadcastReadsModel = sequelize.define('BroadcastReads', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true
    },
    messageId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: MessagesModel,
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
    readAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'broadcastReads',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['messageId', 'userId']
        }
    ]
})

BroadcastReadsModel.belongsTo(MessagesModel, {foreignKey: 'messageId'})
BroadcastReadsModel.belongsTo(usersModel, {foreignKey: 'userId'})

module.exports = BroadcastReadsModel