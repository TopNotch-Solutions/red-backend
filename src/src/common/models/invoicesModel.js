const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const Invoice = sequelize.define('Invoice', {
    id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false
    },
    userId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    accountHolder: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    dueDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    vatNo: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    taxInvoiceNo: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    statementDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    accountNo: {
        type: DataTypes.STRING(40),
        allowNull: true
    },
    postalAddress: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    standNo: {
        type: DataTypes.STRING(40),
        allowNull: true
    },
    townShip: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    address: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    portion: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    area: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    unit: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'invoices',
    timestamps: false
});

module.exports = Invoice;