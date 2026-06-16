const {DataTypes} = require('sequelize')
const sequelize = require('../../config/db')

const OtpModel = sequelize.define('Otp', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    identifier: {
        type: DataTypes.STRING,
        allowNull: false
    },
    otp: {
        type: DataTypes.STRING,
        allowNull: false
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
}, {
    tableName: 'otp',
    timestamps: true
})

module.exports = OtpModel