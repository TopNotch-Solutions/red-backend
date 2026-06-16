const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const {v4: uuidv4} = require('uuid')

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
    customerType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    cellphoneNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    meterNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    address: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    profileImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    pin: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'users_app',
    timestamps: false
})

module.exports = AppUserModel