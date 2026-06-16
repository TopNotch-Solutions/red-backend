const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { v4: uuidv4 } = require('uuid')
const NotificationsModel = require('../../portal/models/NotificationsModel')
const usersModel = require('./usersModel')

const UserNotifications = sequelize.define('UserNotifications', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    notificationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: NotificationsModel,
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    },
    notificationType: {
        type: DataTypes.STRING,
        allowNull: true
    },
}, {
    tableName: 'user_notifications',
    timestamps: false,
})

UserNotifications.belongsTo(usersModel, { foreignKey: 'userId', as: 'user' });
UserNotifications.belongsTo(NotificationsModel, { foreignKey: 'notificationId' });
NotificationsModel.hasMany(UserNotifications, { foreignKey: 'notificationId' })

module.exports = UserNotifications