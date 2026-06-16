const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { v4: uuidv4 } = require('uuid')
const TownsModel = require('./townsModel')
const { on } = require('pdfkit')

const SuburbsModel = sequelize.define('Suburbs', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    suburb: {
        type: DataTypes.STRING,
        allowNull: false
    },
    townId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: TownsModel,
            key: 'id'
        },
        onDelete: 'CASCADE'
    }
}, {
    tableName: 'suburbs',
    timestamps: false
})

SuburbsModel.belongsTo(TownsModel, {foreignKey: 'townId'})
TownsModel.hasMany(SuburbsModel, {foreignKey: 'townId', onDelete: 'CASCADE'})

module.exports = SuburbsModel