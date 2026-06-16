const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { v4: uuidv4 } = require('uuid')

const TipsModel = sequelize.define('Tips', {
    id:{
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    title:{
        type: DataTypes.STRING,
        allowNull: false
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'tips',
    timestamps: true
})

module.exports = TipsModel