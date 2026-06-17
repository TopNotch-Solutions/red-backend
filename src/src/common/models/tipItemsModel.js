const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { randomUUID: uuidv4 } = require('crypto')
const TipsModel = require('./tipsModel')

const TipItemsModel = sequelize.define('TipItems', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: uuidv4,
        allowNull: false
    },
    tipId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: TipsModel,
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    tip: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    tableName: 'tip_items',
    timestamps: false
})

TipItemsModel.belongsTo(TipsModel, { foreignKey: 'tipId' })
TipsModel.hasMany(TipItemsModel, { foreignKey: 'tipId', onDelete: 'CASCADE' })

module.exports = TipItemsModel