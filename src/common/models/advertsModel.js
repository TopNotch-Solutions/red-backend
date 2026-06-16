const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { v4: uuidv4 } = require('uuid')

const AdvertsModel = sequelize.define('Adverts', {
    id:{
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    link: {
        type: DataTypes.STRING,
        allowNull: true
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true
    }
},{
    timestamps: true,
    tableName: 'adverts'
})

module.exports = AdvertsModel