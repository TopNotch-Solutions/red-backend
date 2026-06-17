const sequelize = require('../../config/db')
const {DataTypes} = require('sequelize')
const { randomUUID: uuidv4 } = require('crypto')
const usersModel = require('./usersModel')

const ReceiptsModel = sequelize.define('Receipts', {
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
        }
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    filePath: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'receipts',
    timestamps: true
})

ReceiptsModel.belongsTo(usersModel, {foreignKey: 'id', as: 'user'})
usersModel.hasMany(ReceiptsModel, {foreignKey: 'id', as: 'receipts'})

module.exports = ReceiptsModel