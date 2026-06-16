const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { v4: uuidv4 } = require('uuid')

const NotificationsModel = sequelize.define('NotificationsModel', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true
    },
    scheduledAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    isEvent: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    },
    eventDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    eventStart: {
        type: DataTypes.TIME,
        allowNull: true
    },
    eventEnd: {
        type: DataTypes.TIME,
        allowNull: true
    },
    notificationType: {
        type: DataTypes.STRING,
        allowNull: true
    },
},
    {
        tableName: 'notifications',
        timestamps: false
    })

module.exports = NotificationsModel