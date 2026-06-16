const sequelize = require('../../config/db')
const {DataTypes} = require('sequelize')
const {v4: uuidv4} = require('uuid')
const usersModel = require('./usersModel')

const MeterNumbersModel = sequelize.define('MeterNumbers', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: uuidv4
    },
    meterNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
            model: usersModel,
            key: 'id'
        }
    }
}, {
    tableName: 'meterNumbers',
    timestamps: true
})

MeterNumbersModel.belongsTo(usersModel, {foreignKey: 'userId'})
usersModel.hasMany(MeterNumbersModel, {foreignKey: 'userId'})

module.exports = MeterNumbersModel