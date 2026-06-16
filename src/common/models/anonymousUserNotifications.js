const sequelize = require("../../config/db");
const { DataTypes } = require("sequelize");
const AnonymoustNotificationsModel = require("./anonymousNotificationsModel");
const AnonymousUsersModel = require("./anonymousUsers");
const { v4: uuidv4 } = require("uuid");

const AnonymousUserNotifications = sequelize.define('AnonymousUserNotifications', {
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
            model: 'anonymousUsers',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    notificationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'anonymousNotifications',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    }
}, {
    tableName: 'anonymousUserNotifications',
    timestamps: false
});

AnonymousUserNotifications.belongsTo(AnonymousUsersModel, {foreignKey: 'userId', onDelete: 'CASCADE'})
AnonymousUserNotifications.belongsTo(AnonymoustNotificationsModel, {foreignKey: 'notificationId', onDelete: 'CASCADE'});
AnonymousUsersModel.hasMany(AnonymousUserNotifications, {foreignKey: 'userId', onDelete: 'CASCADE'});
AnonymoustNotificationsModel.hasMany(AnonymousUserNotifications, {foreignKey: 'notificationId', onDelete: 'CASCADE'});

module.exports = AnonymousUserNotifications;