const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { randomUUID: uuidv4 } = require('crypto')

const AppUserModel = sequelize.define('AppUser', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    customerType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    profileImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    meterNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    address: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cellphoneNumber: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'users_app',
    timestamps: false
})

module.exports = AppUserModel