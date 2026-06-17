const {DataTypes} = require('sequelize')
const sequelize = require('../../config/db')
const { randomUUID: uuidv4 } = require('crypto')

const MeterReadingsModel = sequelize.define('MeterReadings', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    accountNo: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    address:{
        type: DataTypes.STRING,
        allowNull: false
    },
    suburb: {
        type: DataTypes.STRING,
        allowNull: false
    },
    town: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cellphone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    meterReading: {
        type: DataTypes.DECIMAL,
        allowNull: false
    }
},
{
    tableName: 'meter_readings',
    timestamps: true
})

module.exports = MeterReadingsModel