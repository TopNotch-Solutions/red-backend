const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { v4: uuidv4 } = require('uuid')

const RoleModel = sequelize.define('Roles', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'roles',
    timestamps: false
})

module.exports = RoleModel
