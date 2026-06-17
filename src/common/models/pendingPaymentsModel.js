const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { randomUUID: uuidv4 } = require('crypto')
const usersModel = require('./usersModel')

const PendingPaymentsModel = sequelize.define('PendingPayments', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    userId:{
        type: DataTypes.STRING,
        allowNull: false,
        references:{
            model: usersModel,
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    amountDue:{
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    dueDate:{
        type: DataTypes.DATE,
        allowNull: false
    },
    accountNumber: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false
    },
    referenceNumber: {
        type: DataTypes.STRING,
        allowNull: true
    }
},{
    tableName: 'pending_payments',
    timestamps: true
})

usersModel.hasMany(PendingPaymentsModel, { foreignKey: 'userId', onDelete: 'CASCADE' })

module.exports = PendingPaymentsModel