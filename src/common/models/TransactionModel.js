const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const usersModel = require('./usersModel')
const { randomUUID: uuidv4 } = require('crypto')
const ElectricityTokensModel = require('./electricityTokensModel')

const TransactionModel = sequelize.define('Transactions', {
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
  transactionType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false
  },
  referenceNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paymentDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  serialNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  vat: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  chargedUnits: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  receiptNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  debtPaymentName: { type: DataTypes.STRING, allowNull: true },
  debtPaymentAmount: { type: DataTypes.STRING, allowNull: true },
  meterNumber: { type: DataTypes.STRING, allowNull: true },
  supplyGroupCode: { type: DataTypes.STRING, allowNull: true },
  keyRevisionNumber: { type: DataTypes.STRING, allowNull: true },
  tariffIndex: { type: DataTypes.STRING, allowNull: true },
  utilityName: { type: DataTypes.STRING, allowNull: true },
  utilityVarRegistrationNumber: { type: DataTypes.STRING, allowNull: true },
  utilityMessage: { type: DataTypes.TEXT, allowNull: true },
  customerName: { type: DataTypes.STRING, allowNull: true },
  customerAddress: { type: DataTypes.STRING, allowNull: true },
  daysSinceLastPurchase: { type: DataTypes.STRING, allowNull: true },
  tariffName: { type: DataTypes.STRING, allowNull: true },
  tariffCentsPerUnit: { type: DataTypes.STRING, allowNull: true },
  utilityAmountExclVat: { type: DataTypes.STRING, allowNull: true },
  freeUnits: { type: DataTypes.STRING, allowNull: true },
  serviceChargeExclVat: { type: DataTypes.STRING, allowNull: true },
  isReprint: { type: DataTypes.STRING, allowNull: true },
  utilityLevyUnits: { type: DataTypes.STRING, allowNull: true },
  utilityLevyDesc: { type: DataTypes.STRING, allowNull: true },
  utilityLevy2Units: { type: DataTypes.STRING, allowNull: true },
  utilityLevy2Desc: { type: DataTypes.STRING, allowNull: true },
  utilityLevy3Units: { type: DataTypes.STRING, allowNull: true },
  utilityLevy3Desc: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'transactions',
  timestamps: true
})

// Associations
TransactionModel.hasMany(ElectricityTokensModel, {
  foreignKey: 'transactionId',
  as: 'tokens'
})

module.exports = TransactionModel
