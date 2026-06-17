const sequelize = require('../../config/db')
const { DataTypes } = require('sequelize')
const { randomUUID: uuidv4 } = require('crypto')

const ChatDeletionsModel = sequelize.define('ChatDeletions', {
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
            model: 'users',
            key: 'id'
        }
    },
    issueId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'issues',
            key: 'id'
        }
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'chatDeletions',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'issueId']
        }
    ]
})

module.exports = ChatDeletionsModel