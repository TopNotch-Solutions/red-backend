const { v4: uuidv4 } = require('uuid')
const sequelize = require('../../config/db')
const { DataTypes } = require('sequelize')

const AnonymousTokensModel = sequelize.define('AnonymousTokens', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    fcmToken: {
        type: DataTypes.STRING,
        allowNull: false
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'anonymous_tokens',
    timestamps: false
});

module.exports = AnonymousTokensModel