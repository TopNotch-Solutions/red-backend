const sequelize = require('../../config/db')
const { DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')

const FilesModel = sequelize.define('File', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    filePath: {
        type: DataTypes.STRING,
        allowNull: true
    },
    size:{
        type: DataTypes.STRING,
        allowNull: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    timestamps: true,
    tableName: 'files'
})

module.exports = FilesModel