// models/RefreshToken.js
const { DataTypes } = require('sequelize');
const { randomUUID: uuidv4 } = require('crypto');
const sequelize = require('../../config/db')

const RefreshTokenModel = sequelize.define('RefreshToken', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users_portal',
            key: 'id'
        }
    },
    token: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    tableName: 'refreshTokens',
    timestamps: true
});

module.exports = RefreshTokenModel;