const {DataTypes} = require('sequelize')
const sequelize = require('../../config/db')
const InvoicesModel = require('./invoicesModel')

const InvoiceChargeModel = sequelize.define('InvoiceCharge', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    invoiceId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: InvoicesModel,
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    date: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    tariff: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    vatPercent: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    vatCharged: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    amountVatExcluded: {
        type: DataTypes.DECIMAL(13, 2),
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(13, 2),
        allowNull: false
    }
}, {
    tableName: 'invoice_charges',
    timestamps: false
});

InvoicesModel.hasMany(InvoiceChargeModel, { foreignKey: 'invoiceId', onDelete: 'CASCADE' });
InvoiceChargeModel.belongsTo(InvoicesModel, { foreignKey: 'invoiceId' });

module.exports = InvoiceChargeModel;