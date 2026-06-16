const sequelize = require('../../config/db')
const { DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const User = require('./UserModel')

const PortalLoginAttemptsModel = sequelize.define('PortalLoginAttempts', {
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
            model: User,
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    lastAttempt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    isBlocked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }   
}, {
    tableName: 'portalLoginAttempts',
    timestamps: true
})

PortalLoginAttemptsModel.belongsTo(User, { foreignKey: 'userId', as: 'user' })
User.hasMany(PortalLoginAttemptsModel, { foreignKey: 'userId' })

module.exports = PortalLoginAttemptsModel