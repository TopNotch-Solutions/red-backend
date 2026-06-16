const sequelize = require('../../config/db');
const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const usersModel = require('./usersModel');
const User = require('../../portal/models/UserModel');

const PaymentsModel = sequelize.define('Payments', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: usersModel,
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    accountHolder: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cellphoneNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Pending'
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    accountNo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    paymentMethod: {
        type: DataTypes.STRING,
        allowNull: true
    },
    refNo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    transactionReferenceNo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    statusMessage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    resultCode: {
        type: DataTypes.STRING,
        allowNull: true
    },
    transactionStatus: {
        type: DataTypes.STRING,
        allowNull: true
    },
    paymentBy: {
        type: DataTypes.DATE,
        allowNull: true
    },
    approvedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: User,
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
}, {
    tableName: 'payments',
    timestamps: true
})

PaymentsModel.belongsTo(usersModel, {
    foreignKey: 'userId',
    as: 'user'
});
PaymentsModel.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

usersModel.hasMany(PaymentsModel, {
    foreignKey: 'userId',
    as: 'payments'
})

module.exports = PaymentsModel
