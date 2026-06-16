const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { v4: uuidv4 } = require('uuid')

const TownsModel = sequelize.define('Towns', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    town: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'towns',
    timestamps: false
})

module.exports = TownsModel