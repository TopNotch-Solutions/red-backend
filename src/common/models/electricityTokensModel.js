const sequelize = require('../../config/db')
const {DataTypes} = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const TransactionModel = require('./TransactionModel')

const ElectricityTokensModel = sequelize.define('ElectricityToken', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    transactionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: TransactionModel,
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    token: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'electricity_tokens',
    timestamps: false
})

module.exports = ElectricityTokensModel