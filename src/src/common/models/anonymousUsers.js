const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { randomUUID: uuidv4 } = require('crypto')

const AnonymousUsersModel = sequelize.define('AnonymousUsers', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: uuidv4,
        allowNull: false
    }
}, {
    tableName: 'anonymousUsers',
    timestamps: true
})

module.exports = AnonymousUsersModel