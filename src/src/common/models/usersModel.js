const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { v4: uuidv4 } = require('uuid')

const usersModel = sequelize.define('UsersModel', {
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
        allowNull: true
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
        allowNull: true
    },
    address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    profileImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    userType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    pin: {
        type: DataTypes.STRING,
        allowNull: true
    },
    town: {
        type: DataTypes.STRING,
        allowNull: true
    },
    suburb_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    streetName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    fcmToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    accountNo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    primaryAccountNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    primaryMeterNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'active'
    },
    availabilityStatus: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Available'
    }
}, {
    tableName: 'users',
    timestamps: true
})

module.exports = usersModel
